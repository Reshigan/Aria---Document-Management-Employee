import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Search, Truck, Package, CheckCircle, FileText, X } from 'lucide-react';

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
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/order-to-cash/deliveries', { params });
      setDeliveries(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading deliveries:', err);
      setError(err.response?.data?.detail || 'Failed to load deliveries');
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
    } catch (err: any) {
      console.error('Error shipping delivery:', err);
      setError(err.response?.data?.detail || 'Failed to ship delivery. Check stock availability.');
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
    } catch (err: any) {
      console.error('Error completing delivery:', err);
      setError(err.response?.data?.detail || 'Failed to complete delivery');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280',
      ready: '#3b82f6',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const renderShipModal = () => {
    if (!showShipModal || !selectedDelivery) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowShipModal(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            width: '90%'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
              Ship Delivery {selectedDelivery.delivery_number}
            </h2>
            <button
              onClick={() => setShowShipModal(false)}
              style={{
                padding: '0.25rem',
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {error && (
              <div style={{
                padding: '1rem',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '0.375rem',
                color: '#991b1b',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Tracking Number
              </label>
              <input
                type="text"
                value={shipFormData.tracking_number}
                onChange={(e) => setShipFormData({ ...shipFormData, tracking_number: e.target.value })}
                placeholder="Enter tracking number"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Carrier
              </label>
              <input
                type="text"
                value={shipFormData.carrier}
                onChange={(e) => setShipFormData({ ...shipFormData, carrier: e.target.value })}
                placeholder="e.g., DHL, FedEx, Courier Guy"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Notes
              </label>
              <textarea
                value={shipFormData.notes}
                onChange={(e) => setShipFormData({ ...shipFormData, notes: e.target.value })}
                rows={3}
                placeholder="Add any shipping notes..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{
              padding: '1rem',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              color: '#1e40af'
            }}>
              <strong>Note:</strong> Shipping this delivery will automatically issue stock from the warehouse.
            </div>
          </div>

          <div style={{
            padding: '1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setShowShipModal(false)}
              style={{
                padding: '0.5rem 1rem',
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmShip}
              style={{
                padding: '0.5rem 1rem',
                background: '#10b981',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Ship & Issue Stock
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Deliveries</h1>
        <p style={{ color: '#6b7280' }}>Manage order deliveries and track shipments</p>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
              <Search
                size={20}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}
              />
              <input
                type="text"
                placeholder="Search by delivery number, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ minWidth: '200px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  background: 'white'
                }}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            Loading deliveries...
          </div>
        ) : deliveries.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Package size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No deliveries found</h3>
            <p style={{ color: '#6b7280' }}>
              {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Deliveries are created from approved sales orders'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Delivery #</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>SO #</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Customer</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Warehouse</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Delivery Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Tracking</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{delivery.delivery_number}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>{delivery.sales_order_number || '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{delivery.customer_name || '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{delivery.warehouse_name || '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(delivery.delivery_date).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem' }}>
                      {delivery.tracking_number ? (
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{delivery.tracking_number}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{delivery.carrier}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: `${getStatusColor(delivery.status)}20`,
                        color: getStatusColor(delivery.status)
                      }}>
                        {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {(delivery.status === 'draft' || delivery.status === 'ready') && (
                          <button
                            onClick={() => handleShip(delivery)}
                            title="Ship & Issue Stock"
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#10b981',
                              border: 'none',
                              borderRadius: '0.375rem',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Truck size={14} />
                            Ship
                          </button>
                        )}
                        {delivery.status === 'shipped' && (
                          <button
                            onClick={() => handleComplete(delivery)}
                            title="Mark as Delivered"
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#8b5cf6',
                              border: 'none',
                              borderRadius: '0.375rem',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <CheckCircle size={14} />
                            Complete
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

      {renderShipModal()}

      <ConfirmDialog
        isOpen={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        onConfirm={confirmComplete}
        title="Complete Delivery"
        message={`Mark delivery ${selectedDelivery?.delivery_number} as complete? This confirms the customer has received the goods.`}
        confirmText="Mark Complete"
        variant="info"
      />
    </div>
  );
}
