import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, Check, Truck, X, FileText, RefreshCw, ShoppingBag, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface SalesOrder {
  id: string;
  order_number: string;
  customer_email?: string;
  customer_name?: string;
  customer_id?: string;
  order_date: string;
  required_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  warehouse_id?: string;
  quote_id?: string;
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

export default function SalesOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>('');
  const [formData, setFormData] = useState<Partial<SalesOrder>>({
    customer_name: '',
    customer_email: '',
    order_date: new Date().toISOString().split('T')[0],
    required_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
    loadProducts();
    loadCustomers();
    loadPricelists();
  }, [searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/order-to-cash/sales-orders', { params });
      const data = response.data?.data || response.data || [];
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading sales orders:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load sales orders');
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
      const response = await api.get('/odoo/pricing/pricelists');
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
      order_date: new Date().toISOString().split('T')[0],
      required_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    });
    setSelectedCustomerId('');
    setSelectedPricelistId('');
    setLineItems([]);
    setShowCreateModal(true);
  };

  const handleEdit = (order: SalesOrder) => {
    setSelectedOrder(order);
    setFormData({
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_id: order.customer_id,
      order_date: order.order_date,
      required_date: order.required_date,
      notes: order.notes,
      warehouse_id: order.warehouse_id
    });
    setLineItems(order.lines || []);
    setShowEditModal(true);
  };

  const handleDelete = (order: SalesOrder) => {
    setSelectedOrder(order);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedOrder) return;
    
    try {
      await api.delete(`/erp/order-to-cash/sales-orders/${selectedOrder.id}`);
      loadOrders();
      setSelectedOrder(null);
    } catch (err: unknown) {
      console.error('Error deleting sales order:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete sales order');
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

      if (showEditModal && selectedOrder) {
        await api.put(`/erp/order-to-cash/sales-orders/${selectedOrder.id}`, payload);
      } else {
        await api.post('/erp/order-to-cash/sales-orders', payload);
      }

      loadOrders();
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedOrder(null);
      setError(null);
    } catch (err: unknown) {
      console.error('Error saving sales order:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save sales order');
    }
  };

  const handleApprove = async (order: SalesOrder) => {
    try {
      await api.post(`/erp/order-to-cash/sales-orders/${order.id}/approve`);
      loadOrders();
    } catch (err: unknown) {
      console.error('Error approving sales order:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to approve sales order');
    }
  };

  const handleCreateDelivery = async (order: SalesOrder) => {
    try {
      const response = await api.post('/erp/order-to-cash/deliveries', {
        sales_order_id: order.id
      });
      alert(`Delivery ${response.data.delivery_number} created successfully!`);
      loadOrders();
    } catch (err: unknown) {
      console.error('Error creating delivery:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to create delivery');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string }> = {
      draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
      approved: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
      in_progress: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
      completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
      cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' }
    };
    return configs[status] || configs.draft;
  };

  const stats = {
    total: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    approved: orders.filter(o => o.status === 'approved').length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalValue: orders.reduce((sum, o) => sum + o.total_amount, 0)
  };

  const renderFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const onClose = () => isEdit ? setShowEditModal(false) : setShowCreateModal(false);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><ShoppingBag className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-xl font-semibold">{isEdit ? 'Edit Sales Order' : 'Create Sales Order'}</h2>
                  <p className="text-white/80 text-sm">Fill in the details below</p>
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
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">1</span>
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer *</label>
                    <select value={selectedCustomerId} onChange={(e) => handleCustomerChange(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all">
                      <option value="">Select a customer...</option>
                      {customers.map(customer => (<option key={customer.id} value={customer.id}>{customer.name} ({customer.email})</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pricelist</label>
                    <select value={selectedPricelistId} onChange={(e) => setSelectedPricelistId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all">
                      <option value="">Default pricing</option>
                      {pricelists.map(pricelist => (<option key={pricelist.id} value={pricelist.id}>{pricelist.name} ({pricelist.currency})</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">2</span>
                  Order Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Date *</label>
                    <input type="date" value={formData.order_date || ''} onChange={(e) => setFormData({ ...formData, order_date: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Required Date</label>
                    <input type="date" value={formData.required_date || ''} onChange={(e) => setFormData({ ...formData, required_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                  <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none" placeholder="Add any notes..." />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">3</span>
                  Line Items
                </h3>
                <LineItemsTable items={lineItems} onChange={setLineItems} products={products} pricingContext={{ customer_id: selectedCustomerId || undefined, pricelist_id: selectedPricelistId || undefined, date: formData.order_date }} />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30">{isEdit ? 'Update Order' : 'Create Order'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Sales Orders</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage customer orders and fulfillment</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadOrders()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30">
              <Plus className="h-5 w-5" />New Order
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
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/30"><ShoppingBag className="h-6 w-6 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p></div>
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
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30"><Check className="h-6 w-6 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p><p className="text-sm text-gray-500 dark:text-gray-400">Approved</p></div>
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
                <input type="text" placeholder="Search by order number or customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all min-w-[180px]">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading sales orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><ShoppingBag className="h-8 w-8 text-gray-400" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No sales orders found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first sales order'}</p>
              {!searchTerm && !statusFilter && (
                <button onClick={handleCreate} className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 transition-all">Create First Order</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order #</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Required Date</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {orders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/sales/orders/${order.id}`} className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">{order.order_number}</Link>
                        </td>
                        <td className="px-6 py-4">
                          <div><p className="font-medium text-gray-900 dark:text-white">{order.customer_name}</p>{order.customer_email && (<p className="text-sm text-gray-500 dark:text-gray-400">{order.customer_email}</p>)}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(order.order_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{order.required_date ? new Date(order.required_date).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">R {order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>{order.status.replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {order.status === 'draft' && (
                              <>
                                <button onClick={() => handleEdit(order)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                                <button onClick={() => handleApprove(order)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-xs font-medium hover:from-blue-600 hover:to-indigo-600 transition-all"><Check className="h-3.5 w-3.5" />Approve</button>
                                <button onClick={() => handleDelete(order)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                              </>
                            )}
                            {order.status === 'approved' && (
                              <button onClick={() => handleCreateDelivery(order)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-lg text-xs font-medium hover:from-purple-600 hover:to-violet-600 transition-all"><Truck className="h-3.5 w-3.5" />Deliver</button>
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

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} title="Delete Sales Order" message={`Are you sure you want to delete order ${selectedOrder?.order_number}? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  );
}
