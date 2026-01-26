import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Search, Trash2, Check, Clock, Package, FileText, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  order_date: string;
  expected_delivery_date: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Supplier {
  id: number;
  supplier_code: string;
  supplier_name: string;
}

interface Product {
  id: number;
  product_code: string;
  product_name: string;
  cost_price: number;
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
    lines: [{ product_id: '', quantity: '1', unit_price: '0' }]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [posRes, suppliersRes, productsRes] = await Promise.all([
        api.get('/erp/procure-to-pay/purchase-orders'),
        api.get('/erp/master-data/suppliers'),
        api.get('/erp/order-to-cash/products')
      ]);
      setPurchaseOrders(posRes.data);
      setSuppliers(suppliersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        supplier_id: parseInt(formData.supplier_id),
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || null,
        notes: formData.notes,
        lines: formData.lines.map(line => ({
          product_id: parseInt(line.product_id),
          quantity: parseFloat(line.quantity),
          unit_price: parseFloat(line.unit_price),
          description: products.find(p => p.id === parseInt(line.product_id))?.product_name || ''
        }))
      };

      await api.post('/erp/procure-to-pay/purchase-orders', payload);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving purchase order:', error);
      alert(error.response?.data?.detail || 'Failed to save purchase order');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;
    try {
      await api.delete(`/erp/procure-to-pay/purchase-orders/${id}`);
      loadData();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      alert('Failed to delete purchase order');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/erp/procure-to-pay/purchase-orders/${id}/approve`);
      loadData();
    } catch (error) {
      console.error('Error approving purchase order:', error);
      alert('Failed to approve purchase order');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      notes: '',
      lines: [{ product_id: '', quantity: '1', unit_price: '0' }]
    });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { product_id: '', quantity: '1', unit_price: '0' }]
    });
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statsByStatus = {
    draft: filteredPOs.filter(po => po.status === 'draft'),
    sent: filteredPOs.filter(po => po.status === 'sent'),
    acknowledged: filteredPOs.filter(po => po.status === 'acknowledged'),
    received: filteredPOs.filter(po => po.status === 'received')
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      acknowledged: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      partially_received: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return styles[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const getStatIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-6 w-6 text-white" />;
      case 'sent': return <Clock className="h-6 w-6 text-white" />;
      case 'acknowledged': return <Package className="h-6 w-6 text-white" />;
      case 'received': return <CheckCircle className="h-6 w-6 text-white" />;
      default: return <ShoppingCart className="h-6 w-6 text-white" />;
    }
  };

  const getStatGradient = (status: string) => {
    switch (status) {
      case 'draft': return 'from-gray-500 to-slate-600';
      case 'sent': return 'from-blue-500 to-indigo-500';
      case 'acknowledged': return 'from-amber-500 to-orange-500';
      case 'received': return 'from-green-500 to-emerald-500';
      default: return 'from-orange-500 to-red-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg shadow-orange-500/30">
              <ShoppingCart className="h-7 w-7 text-white" />
            </div>
            Purchase Orders
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage purchase orders and track supplier deliveries</p>
        </div>
        <button
          onClick={() => navigate('/ap/purchase-orders/new')}
          className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          New Purchase Order
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search purchase orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-[180px]"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="partially_received">Partially Received</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {Object.entries(statsByStatus).map(([status, pos]) => (
          <div key={status} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-gradient-to-br ${getStatGradient(status)} rounded-xl shadow-lg`}>
                {getStatIcon(status)}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pos.length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{status.replace('_', ' ')} POs</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  R {pos.reduce((sum, po) => sum + po.total_amount, 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {filteredPOs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No purchase orders found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first purchase order to order from suppliers</p>
            <button
              onClick={() => navigate('/ap/purchase-orders/new')}
              className="mt-4 px-5 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/30"
            >
              Create Purchase Order
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">PO Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Order Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPOs.map((po) => {
                const supplier = suppliers.find(s => s.id === po.supplier_id);
                return (
                  <tr 
                    key={po.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/ap/purchase-orders/${po.id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{po.po_number}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{supplier?.supplier_name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(po.order_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">R {po.total_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(po.status)}`}>
                        {po.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-center">
                        {po.status === 'draft' && (
                          <button
                            onClick={() => handleApprove(po.id)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(po.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-[700px] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                New Purchase Order
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Supplier *
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-5">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items *</label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-xs font-medium hover:from-orange-600 hover:to-red-600 transition-all"
                  >
                    + Add Line
                  </button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                  {formData.lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-6 gap-3">
                      <select
                        value={line.product_id}
                        onChange={(e) => {
                          const productId = e.target.value;
                          const product = products.find(p => p.id === parseInt(productId));
                          const newLines = [...formData.lines];
                          newLines[index] = { ...newLines[index], product_id: productId };
                          if (product) {
                            newLines[index].unit_price = product.cost_price.toString();
                          }
                          setFormData({ ...formData, lines: newLines });
                        }}
                        required
                        className="col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select Product</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>{product.product_name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => {
                          const newLines = [...formData.lines];
                          newLines[index] = { ...newLines[index], quantity: e.target.value };
                          setFormData({ ...formData, lines: newLines });
                        }}
                        required
                        min="0.01"
                        step="0.01"
                        className="col-span-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={line.unit_price}
                        onChange={(e) => {
                          const newLines = [...formData.lines];
                          newLines[index] = { ...newLines[index], unit_price: e.target.value };
                          setFormData({ ...formData, lines: newLines });
                        }}
                        required
                        min="0"
                        step="0.01"
                        className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/30"
                >
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
