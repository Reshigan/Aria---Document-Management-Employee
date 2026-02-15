import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, Send, DollarSign, FileText, X, RefreshCw, TrendingUp, Clock, CheckCircle, AlertCircle, Download, Printer, Mail } from 'lucide-react';
import { documentGenerationService, auditTrailService, emailNotificationService } from '../../services';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_email?: string;
  customer_name?: string;
  customer_id?: string;
  invoice_date: string;
  due_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid?: number;
  notes?: string;
  delivery_id?: string;
  delivery_number?: string;
  lines?: LineItem[];
}

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  unit_of_measure: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<Partial<Invoice>>({
    customer_name: '',
    customer_email: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
    loadProducts();
  }, [searchTerm, statusFilter]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/order-to-cash/invoices', { params });
      const data = response.data?.data || response.data || [];
      setInvoices(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading invoices:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load invoices');
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

  const handleCreate = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    });
    setLineItems([]);
    setShowCreateModal(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email,
      customer_id: invoice.customer_id,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      notes: invoice.notes
    });
    setLineItems(invoice.lines || []);
    setShowEditModal(true);
  };

  const handleDelete = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;
    
    try {
      await api.delete(`/erp/order-to-cash/invoices/${selectedInvoice.id}`);
      loadInvoices();
      setSelectedInvoice(null);
    } catch (err: unknown) {
      console.error('Error deleting invoice:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete invoice');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lineItems.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    if (!formData.customer_name) {
      setError('Please fill in customer details');
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

      if (showEditModal && selectedInvoice) {
        await api.put(`/erp/order-to-cash/invoices/${selectedInvoice.id}`, payload);
      } else {
        await api.post('/erp/order-to-cash/invoices', payload);
      }

      loadInvoices();
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedInvoice(null);
      setError(null);
    } catch (err: unknown) {
      console.error('Error saving invoice:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save invoice');
    }
  };

  const handlePost = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPostDialog(true);
  };

  const confirmPost = async () => {
    if (!selectedInvoice) return;
    
    try {
      await api.post(`/erp/order-to-cash/invoices/${selectedInvoice.id}/post`);
      alert('Invoice posted to AR successfully!');
      loadInvoices();
      setShowPostDialog(false);
      setSelectedInvoice(null);
    } catch (err: unknown) {
      console.error('Error posting invoice:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to post invoice');
    }
  };

    const handleSend = async (invoice: Invoice) => {
      try {
        await api.post(`/erp/order-to-cash/invoices/${invoice.id}/send`);
        await auditTrailService.log({
          eventType: 'email_sent',
          resourceType: 'invoice',
          resourceId: invoice.id,
          description: `Invoice ${invoice.invoice_number} sent to ${invoice.customer_email}`,
          metadata: { recipient: invoice.customer_email }
        });
        alert(`Invoice sent to ${invoice.customer_email}!`);
        loadInvoices();
      } catch (err: unknown) {
        console.error('Error sending invoice:', err);
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Failed to send invoice');
      }
    };

    const handleDownloadPDF = async (invoice: Invoice) => {
      try {
        const documentData = {
          id: invoice.id,
          number: invoice.invoice_number,
          date: invoice.invoice_date,
          dueDate: invoice.due_date,
          customer: {
            name: invoice.customer_name || '',
            email: invoice.customer_email || ''
          },
          items: (invoice.lines || []).map(line => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unit_price,
            total: line.quantity * line.unit_price
          })),
          subtotal: invoice.subtotal,
          tax: invoice.tax_amount,
          total: invoice.total_amount,
          notes: invoice.notes
        };
        await documentGenerationService.downloadDocument('invoice', documentData, `Invoice-${invoice.invoice_number}.pdf`);
        await auditTrailService.log({
          eventType: 'export',
          resourceType: 'invoice',
          resourceId: invoice.id,
          description: `Invoice ${invoice.invoice_number} downloaded as PDF`
        });
      } catch (err) {
        console.error('Error downloading PDF:', err);
        setError('Failed to download PDF');
      }
    };

    const handlePrintInvoice = async (invoice: Invoice) => {
      try {
        const documentData = {
          id: invoice.id,
          number: invoice.invoice_number,
          date: invoice.invoice_date,
          dueDate: invoice.due_date,
          customer: {
            name: invoice.customer_name || '',
            email: invoice.customer_email || ''
          },
          items: (invoice.lines || []).map(line => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unit_price,
            total: line.quantity * line.unit_price
          })),
          subtotal: invoice.subtotal,
          tax: invoice.tax_amount,
          total: invoice.total_amount,
          notes: invoice.notes
        };
        await documentGenerationService.printDocument('invoice', documentData);
        await auditTrailService.log({
          eventType: 'view',
          resourceType: 'invoice',
          resourceId: invoice.id,
          description: `Invoice ${invoice.invoice_number} printed`
        });
      } catch (err) {
        console.error('Error printing invoice:', err);
        setError('Failed to print invoice');
      }
    };

    const handleEmailInvoice = async (invoice: Invoice) => {
      if (!invoice.customer_email) {
        setError('No customer email address available');
        return;
      }
      try {
        const documentData = {
          id: invoice.id,
          number: invoice.invoice_number,
          date: invoice.invoice_date,
          dueDate: invoice.due_date,
          customer: {
            name: invoice.customer_name || '',
            email: invoice.customer_email || ''
          },
          items: (invoice.lines || []).map(line => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unit_price,
            total: line.quantity * line.unit_price
          })),
          subtotal: invoice.subtotal,
          tax: invoice.tax_amount,
          total: invoice.total_amount,
          notes: invoice.notes
        };
        await emailNotificationService.sendInvoiceEmail(invoice.id, [invoice.customer_email]);
        await documentGenerationService.emailDocument('invoice', documentData, {
          to: [invoice.customer_email],
          subject: `Invoice ${invoice.invoice_number} from ARIA`,
          body: `Please find attached invoice ${invoice.invoice_number} for R ${Number(invoice.total_amount ?? 0).toLocaleString()}.`
        });
        await auditTrailService.log({
          eventType: 'email_sent',
          resourceType: 'invoice',
          resourceId: invoice.id,
          description: `Invoice ${invoice.invoice_number} emailed to ${invoice.customer_email}`
        });
        alert(`Invoice emailed to ${invoice.customer_email}!`);
      } catch (err) {
        console.error('Error emailing invoice:', err);
        setError('Failed to email invoice');
      }
    };

    const getStatusConfig= (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string }> = {
      draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
      posted: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
      sent: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
      paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
      overdue: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
      cancelled: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' }
    };
    return configs[status] || configs.draft;
  };

  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    outstandingValue: invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + (i.total_amount - (i.amount_paid || 0)), 0)
  };

  const renderFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const onClose = () => isEdit ? setShowEditModal(false) : setShowCreateModal(false);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg"><FileText className="h-5 w-5" /></div>
                <h2 className="text-lg font-semibold">{isEdit ? 'Edit Invoice' : 'Create New Invoice'}</h2>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-60px)]">
            <div className="p-3 space-y-2">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">1</span>
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
                    <input type="text" value={formData.customer_name || ''} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} required className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Enter customer name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Email *</label>
                    <input type="email" value={formData.customer_email || ''} onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })} required className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="customer@example.com" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">2</span>
                  Invoice Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Date *</label>
                    <input type="date" value={formData.invoice_date || ''} onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })} required className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                    <input type="date" value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={1} className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" placeholder="Add any notes or special instructions..." />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">3</span>
                  Line Items
                </h3>
                <LineItemsTable items={lineItems} onChange={setLineItems} products={products} />
              </div>
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all ">{isEdit ? 'Update Invoice' : 'Create Invoice'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Invoices</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Manage customer invoices and track payments</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadInvoices()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all ">
              <Plus className="h-5 w-5" />New Invoice
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl "><FileText className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Invoices</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.draft}</p><p className="text-xs text-gray-500 dark:text-gray-400">Draft</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.paid}</p><p className="text-xs text-gray-500 dark:text-gray-400">Paid</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">R {Number(stats.outstandingValue ?? 0).toLocaleString()}</p><p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search by customer, invoice number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[180px]">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText className="h-8 w-8 text-gray-400" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No invoices found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first invoice'}</p>
              {!searchTerm && !statusFilter && (
                <button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all">Create First Invoice</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {invoices.map((invoice) => {
                    const balance = invoice.total_amount - (invoice.amount_paid || 0);
                    const statusConfig = getStatusConfig(invoice.status);
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4"><span className="font-semibold text-gray-900 dark:text-white">{invoice.invoice_number}</span></td>
                        <td className="px-6 py-4">
                          <div><p className="font-medium text-gray-900 dark:text-white">{invoice.customer_name}</p>{invoice.customer_email && (<p className="text-xs text-gray-500 dark:text-gray-400">{invoice.customer_email}</p>)}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">R {Number(invoice.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className={`px-6 py-4 text-right font-semibold ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>R {Number(balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                      <button onClick={() => handleDownloadPDF(invoice)} title="Download PDF" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"><Download className="h-4 w-4" /></button>
                                                      <button onClick={() => handlePrintInvoice(invoice)} title="Print" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"><Printer className="h-4 w-4" /></button>
                                                      {invoice.customer_email && (
                                                        <button onClick={() => handleEmailInvoice(invoice)} title="Email Invoice" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"><Mail className="h-4 w-4" /></button>
                                                      )}
                                                      {invoice.status === 'draft' && (
                                                        <>
                                                          <button onClick={() => handleEdit(invoice)} title="Edit" className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                                                          <button onClick={() => handlePost(invoice)} title="Post to AR" className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs font-medium hover:from-green-600 hover:to-emerald-600 transition-all"><DollarSign className="h-3.5 w-3.5" />Post</button>
                                                          <button onClick={() => handleDelete(invoice)} title="Delete" className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                        </>
                                                      )}
                                                      {(invoice.status === 'posted' || invoice.status === 'sent') && invoice.customer_email && (
                                                        <button onClick={() => handleSend(invoice)} title="Send to Customer" className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-lg text-xs font-medium hover:from-purple-600 hover:to-violet-600 transition-all"><Send className="h-3.5 w-3.5" />Send</button>
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

      {renderFormModal(false)}
      {renderFormModal(true)}

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} title="Delete Invoice" message={`Are you sure you want to delete invoice ${selectedInvoice?.invoice_number}? This action cannot be undone.`} confirmText="Delete" variant="danger" />
      <ConfirmDialog isOpen={showPostDialog} onClose={() => setShowPostDialog(false)} onConfirm={confirmPost} title="Post Invoice" message={`Post invoice ${selectedInvoice?.invoice_number} to Accounts Receivable? This will make it official and cannot be undone.`} confirmText="Post to AR" variant="info" />
    </div>
  );
}
