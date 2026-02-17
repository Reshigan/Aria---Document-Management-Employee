import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Plus, Search, Eye, Check, Truck, FileText, RefreshCw, Package, Clock, CheckCircle, AlertCircle, X, ShoppingCart, Download, Printer, Mail } from 'lucide-react';
import { documentGenerationService, auditTrailService, emailNotificationService } from '../../services';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  po_date: string;
  expected_delivery_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  approved_by?: string;
  approved_at?: string;
  lines?: POLine[];
}

interface POLine {
  id: string;
  line_number: number;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percentage: number;
  line_total: number;
  received_quantity: number;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  standard_cost: number;
  unit_of_measure: string;
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
    lines: [{ product_id: '', description: '', quantity: '1', unit_price: '0' }]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadProducts();
  }, [searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/procure-to-pay/purchase-orders');
      const data = response.data?.data || response.data || [];
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading purchase orders:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await api.get('/erp/procure-to-pay/suppliers');
      const data = response.data?.data || response.data || [];
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
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

    const approvePO = async (poId: string) => {
      try {
        await api.post(`/erp/procure-to-pay/purchase-orders/${poId}/approve`);
        await auditTrailService.log({
          eventType: 'approval',
          resourceType: 'purchase_order',
          resourceId: poId,
          description: `Purchase Order approved`
        });
        loadOrders();
      } catch (err: unknown) {
        console.error('Error approving PO:', err);
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Failed to approve purchase order');
      }
    };

    const handleDownloadPDF = async (order: PurchaseOrder) => {
      try {
        const documentData = {
          id: order.id,
          number: order.po_number,
          date: order.po_date,
          expectedDeliveryDate: order.expected_delivery_date,
          supplier: {
            name: order.supplier_name || '',
            id: order.supplier_id
          },
          items: (order.lines || []).map(line => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unit_price,
            total: line.line_total
          })),
          subtotal: order.subtotal,
          tax: order.tax_amount,
          total: order.total_amount
        };
        await documentGenerationService.downloadDocument('purchase_order', documentData, `PO-${order.po_number}.pdf`);
        await auditTrailService.log({
          eventType: 'export',
          resourceType: 'purchase_order',
          resourceId: order.id,
          description: `Purchase Order ${order.po_number} downloaded as PDF`
        });
      } catch (err) {
        console.error('Error downloading PDF:', err);
        setError('Failed to download PDF');
      }
    };

    const handlePrintPO = async (order: PurchaseOrder) => {
      try {
        const documentData = {
          id: order.id,
          number: order.po_number,
          date: order.po_date,
          expectedDeliveryDate: order.expected_delivery_date,
          supplier: {
            name: order.supplier_name || '',
            id: order.supplier_id
          },
          items: (order.lines || []).map(line => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unit_price,
            total: line.line_total
          })),
          subtotal: order.subtotal,
          tax: order.tax_amount,
          total: order.total_amount
        };
        await documentGenerationService.printDocument('purchase_order', documentData);
        await auditTrailService.log({
          eventType: 'view',
          resourceType: 'purchase_order',
          resourceId: order.id,
          description: `Purchase Order ${order.po_number} printed`
        });
      } catch (err) {
        console.error('Error printing PO:', err);
        setError('Failed to print purchase order');
      }
    };

    const handleEmailPO = async (order: PurchaseOrder) => {
      const supplier = suppliers.find(s => s.id === order.supplier_id);
      if (!supplier?.email) {
        setError('No supplier email address available');
        return;
      }
      try {
        await emailNotificationService.sendEmail({
          templateType: 'purchase_order',
          to: [supplier.email],
          subject: `Purchase Order ${order.po_number}`,
          data: { poNumber: order.po_number, supplierName: supplier.name, total: order.total_amount }
        });
        await auditTrailService.log({
          eventType: 'email_sent',
          resourceType: 'purchase_order',
          resourceId: order.id,
          description: `Purchase Order ${order.po_number} emailed to ${supplier.email}`
        });
        alert(`Purchase Order emailed to ${supplier.email}!`);
      } catch (err) {
        console.error('Error emailing PO:', err);
        setError('Failed to email purchase order');
      }
    };

    const getStatusConfig= (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string }> = {
      draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
      approved: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
      ordered: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
      receiving: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
      received: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
      cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' }
    };
    return configs[status] || configs.draft;
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      po_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      notes: '',
      lines: [{ product_id: '', description: '', quantity: '1', unit_price: '0' }]
    });
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      setError('Please select a supplier');
      return;
    }
    if (formData.lines.every(line => !line.product_id && !line.description)) {
      setError('Please add at least one line item');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        supplier_id: formData.supplier_id,
        po_date: formData.po_date,
        expected_delivery_date: formData.expected_delivery_date || null,
        notes: formData.notes,
        lines: formData.lines.filter(line => line.product_id || line.description).map(line => ({
          product_id: line.product_id || null,
          description: line.description || products.find(p => p.id === line.product_id)?.name || '',
          quantity: parseFloat(line.quantity) || 1,
          unit_price: parseFloat(line.unit_price) || 0
        }))
      };

      await api.post('/erp/procure-to-pay/purchase-orders', payload);
      setShowCreateModal(false);
      resetForm();
      loadOrders();
    } catch (err: unknown) {
      console.error('Error creating purchase order:', err);
      const error = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(error.response?.data?.detail || error.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { product_id: '', description: '', quantity: '1', unit_price: '0' }]
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 1) {
      setFormData({
        ...formData,
        lines: formData.lines.filter((_, i) => i !== index)
      });
    }
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newLines[index].unit_price = String(product.standard_cost || 0);
        newLines[index].description = product.name;
      }
    }
    setFormData({ ...formData, lines: newLines });
  };

  const calculateLineTotal = (line: typeof formData.lines[0]) => {
    return (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
  };

  const calculateTotal = () => {
    return formData.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    approved: orders.filter(o => o.status === 'approved').length,
    received: orders.filter(o => o.status === 'received').length,
    totalValue: orders.reduce((sum, o) => sum + o.total_amount, 0)
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Purchase Orders</h1>
            <p className="text-gray-500 dark:text-gray-300 text-sm">Manage purchase orders and procurement workflow</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadOrders()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition-all ">
              <Plus className="h-5 w-5" />Create PO
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg"><ShoppingCart className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total POs</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg"><Clock className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.draft}</p><p className="text-xs text-gray-500 dark:text-gray-300">Draft</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg"><Check className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.approved}</p><p className="text-xs text-gray-500 dark:text-gray-300">Approved</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg"><Package className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">R {Number(stats.totalValue ?? 0).toLocaleString()}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Value</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <input type="text" placeholder="Search by PO number or supplier..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all min-w-[180px]">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="ordered">Ordered</option>
                <option value="receiving">Receiving</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-300">Loading purchase orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><ShoppingCart className="h-8 w-8 text-gray-300" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No purchase orders found</h3>
              <p className="text-gray-500 dark:text-gray-300 mb-6">{searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first purchase order'}</p>
              {!searchTerm && !statusFilter && (
                <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition-all">Create First PO</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">PO #</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">PO Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Expected Delivery</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredOrders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/procurement/purchase-orders/${order.id}`} className="font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">{order.po_number}</Link>
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{order.supplier_name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{(order.po_date ? new Date(order.po_date).toLocaleDateString() : "-")}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">R {Number(order.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} capitalize`}>{order.status}</span>
                        </td>
                        <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                      <button onClick={() => handleDownloadPDF(order)} title="Download PDF" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"><Download className="h-4 w-4" /></button>
                                                      <button onClick={() => handlePrintPO(order)} title="Print" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"><Printer className="h-4 w-4" /></button>
                                                      <button onClick={() => handleEmailPO(order)} title="Email PO" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"><Mail className="h-4 w-4" /></button>
                                                      {order.status === 'draft' && (
                                                        <button onClick={() => approvePO(order.id)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-xs font-medium hover:from-blue-600 hover:to-indigo-600 transition-all"><Check className="h-3.5 w-3.5" />Approve</button>
                                                      )}
                                                      <button onClick={() => setSelectedOrder(order)} className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"><Eye className="h-3.5 w-3.5" />View</button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowCreateModal(false); resetForm(); }}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg"><ShoppingCart className="h-6 w-6" /></div>
                  <div>
                    <h2 className="text-xl font-semibold">New Purchase Order</h2>
                    <p className="text-white/80 text-sm">Fill in the details below</p>
                  </div>
                </div>
                <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <form onSubmit={handleCreatePO} className="overflow-y-auto max-h-[calc(90vh-60px)]">
              <div className="p-3 space-y-2">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Supplier *</label>
                      <select value={formData.supplier_id} onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })} required className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                        <option value="">Select Supplier</option>
                        {suppliers.map(supplier => (<option key={supplier.id} value={supplier.id}>{supplier.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">PO Date *</label>
                      <input type="date" value={formData.po_date} onChange={(e) => setFormData({ ...formData, po_date: e.target.value })} required className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Expected Delivery</label>
                      <input type="date" value={formData.expected_delivery_date} onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Notes</label>
                      <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes" className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300">Line Items</h3>
                    <button type="button" onClick={addLine} className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">+ Add Line</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Product</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Description</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300 w-24">Qty</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300 w-32">Unit Price</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300 w-32">Total</th>
                          <th className="px-3 py-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {formData.lines.map((line, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2">
                              <select value={line.product_id} onChange={(e) => updateLine(index, 'product_id', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                                <option value="">Select Product</option>
                                {products.map(product => (<option key={product.id} value={product.id}>{product.name}</option>))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} placeholder="Description" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)} min="1" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" value={line.unit_price} onChange={(e) => updateLine(index, 'unit_price', e.target.value)} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right" />
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">R {calculateLineTotal(line).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-center">
                              {formData.lines.length > 1 && (
                                <button type="button" onClick={() => removeLine(index)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                          <td colSpan={4} className="px-3 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Total:</td>
                          <td className="px-3 py-3 text-right font-bold text-gray-900 dark:text-white">R {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className={`px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium transition-all  ${submitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-orange-700 hover:to-amber-700'}`}>{submitting ? 'Creating...' : 'Create Purchase Order'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg"><FileText className="h-6 w-6" /></div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedOrder.po_number}</h2>
                    <p className="text-white/80 text-sm">{selectedOrder.supplier_name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-300">PO Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{(selectedOrder.po_date ? new Date(selectedOrder.po_date).toLocaleDateString() : "-")}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-300">Expected Delivery</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString() : '-'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-300">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusConfig(selectedOrder.status).bg} ${getStatusConfig(selectedOrder.status).text} border ${getStatusConfig(selectedOrder.status).border} capitalize`}>{selectedOrder.status}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-300">Total Amount</p>
                  <p className="font-bold text-xl text-gray-900 dark:text-white">R {Number(selectedOrder.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              {selectedOrder.lines && selectedOrder.lines.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Line Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.lines.map((line, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{line.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">{line.quantity} x R {Number(line.unit_price ?? 0).toFixed(2)}</p>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white">R {Number(line.line_total ?? 0).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
