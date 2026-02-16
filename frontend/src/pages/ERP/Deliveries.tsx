import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Search, Truck, Package, CheckCircle, X, RefreshCw, AlertCircle, Clock, MapPin } from 'lucide-react';

interface Delivery {
  id: string;
  delivery_number: string;
  sales_order_id?: string;
  sales_order_number?: string;
  customer_name?: string;
  warehouse_name?: string;
  delivery_date: string;
  status: string;
  tracking_number?: string;
  carrier?: string;
  notes?: string;
  lines?: DeliveryLine[];
}

interface DeliveryLine {
  id: string;
  product_id: string;
  product_code?: string;
  product_name?: string;
  quantity: number;
  quantity_shipped?: number;
}

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showShipModal, setShowShipModal] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [shipFormData, setShipFormData] = useState({
    tracking_number: '',
    carrier: '',
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeliveries();
  }, [searchTerm, statusFilter]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/order-to-cash/deliveries', { params });
      const d = response.data;
      setDeliveries(Array.isArray(d) ? d : d.deliveries || d.data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading deliveries:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleShip = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setShipFormData({
      tracking_number: delivery.tracking_number || '',
      carrier: delivery.carrier || '',
      notes: delivery.notes || ''
    });
    setShowShipModal(true);
  };

  const confirmShip = async () => {
    if (!selectedDelivery) return;
    
    try {
      await api.post(`/erp/order-to-cash/deliveries/${selectedDelivery.id}/ship`, shipFormData);
      alert('Delivery shipped successfully! Stock has been issued.');
      loadDeliveries();
      setShowShipModal(false);
      setSelectedDelivery(null);
      setError(null);
    } catch (err: unknown) {
      console.error('Error shipping delivery:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to ship delivery. Check stock availability.');
    }
  };

  const handleComplete = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setShowCompleteDialog(true);
  };

  const confirmComplete = async () => {
    if (!selectedDelivery) return;
    
    try {
      await api.post(`/erp/order-to-cash/deliveries/${selectedDelivery.id}/complete`);
      alert('Delivery marked as complete!');
      loadDeliveries();
      setShowCompleteDialog(false);
      setSelectedDelivery(null);
    } catch (err: unknown) {
      console.error('Error completing delivery:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to complete delivery');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      ready: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      shipped: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      delivered: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
    };
    return styles[status] || styles.draft;
  };

  const stats = {
    total: deliveries.length,
    draft: deliveries.filter(d => d.status === 'draft').length,
    ready: deliveries.filter(d => d.status === 'ready').length,
    shipped: deliveries.filter(d => d.status === 'shipped').length,
    delivered: deliveries.filter(d => d.status === 'delivered').length
  };

  const renderShipModal = () => {
    if (!showShipModal || !selectedDelivery) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShipModal(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Truck className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-xl font-semibold">Ship Delivery</h2>
                  <p className="text-white/80 text-sm">{selectedDelivery.delivery_number}</p>
                </div>
              </div>
              <button onClick={() => setShowShipModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tracking Number</label>
              <input type="text" value={shipFormData.tracking_number} onChange={(e) => setShipFormData({ ...shipFormData, tracking_number: e.target.value })} placeholder="Enter tracking number" className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carrier</label>
              <input type="text" value={shipFormData.carrier} onChange={(e) => setShipFormData({ ...shipFormData, carrier: e.target.value })} placeholder="e.g., DHL, FedEx, Courier Guy" className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea value={shipFormData.notes} onChange={(e) => setShipFormData({ ...shipFormData, notes: e.target.value })} rows={1} placeholder="Add any shipping notes..." className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none" />
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-700 dark:text-blue-300"><strong>Note:</strong> Shipping this delivery will automatically issue stock from the warehouse.</p>
            </div>
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
            <button onClick={() => setShowShipModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
            <button onClick={confirmShip} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 transition-all ">Ship & Issue Stock</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Deliveries</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage order deliveries and track shipments</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadDeliveries()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl "><Truck className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl "><Clock className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.draft}</p><p className="text-xs text-gray-500 dark:text-gray-400">Draft</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Package className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.ready}</p><p className="text-xs text-gray-500 dark:text-gray-400">Ready</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><Truck className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.shipped}</p><p className="text-xs text-gray-500 dark:text-gray-400">Shipped</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.delivered}</p><p className="text-xs text-gray-500 dark:text-gray-400">Delivered</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search by delivery number, customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all min-w-[180px]">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading deliveries...</p>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package className="h-8 w-8 text-gray-400" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No deliveries found</h3>
              <p className="text-gray-500 dark:text-gray-400">{searchTerm || statusFilter ? 'Try adjusting your filters' : 'Deliveries are created from approved sales orders'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delivery #</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SO #</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Warehouse</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delivery Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tracking</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/deliveries/${delivery.id}`} className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">{delivery.delivery_number}</Link>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{delivery.sales_order_number || '-'}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{delivery.customer_name || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{delivery.warehouse_name || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(delivery.delivery_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        {delivery.tracking_number ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{delivery.tracking_number}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{delivery.carrier}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(delivery.status)}`}>{delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {(delivery.status === 'draft' || delivery.status === 'ready') && (
                            <button onClick={() => handleShip(delivery)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-medium hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm">
                              <Truck className="h-3 w-3" />Ship
                            </button>
                          )}
                          {delivery.status === 'shipped' && (
                            <button onClick={() => handleComplete(delivery)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg text-xs font-medium hover:from-purple-700 hover:to-violet-700 transition-all shadow-sm">
                              <CheckCircle className="h-3 w-3" />Complete
                            </button>
                          )}
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

      {renderShipModal()}

      <ConfirmDialog isOpen={showCompleteDialog} onClose={() => setShowCompleteDialog(false)} onConfirm={confirmComplete} title="Complete Delivery" message={`Are you sure you want to mark delivery ${selectedDelivery?.delivery_number} as complete?`} confirmText="Complete" variant="primary" />
    </div>
  );
}
