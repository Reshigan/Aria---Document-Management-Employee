import { DocumentDetail, DocumentDetailConfig } from '../../../components/DocumentDetail/DocumentDetail';
import api from '../../../lib/api';
import { Truck, XCircle } from 'lucide-react';

const config: DocumentDetailConfig = {
  title: 'Delivery',
  apiPath: '/erp/order-to-cash/deliveries',
  listPath: '/deliveries',
  fields: {
    number: 'delivery_number',
    date: 'delivery_date',
    status: 'status',
    party: 'customer_name',
    partyLabel: 'Customer',
    reference: 'sales_order_id',
    notes: 'notes'
  },
  lineItems: {
    arrayKey: 'lines',
    columns: [
      { key: 'line_number', label: '#' },
      { key: 'description', label: 'Description' },
      {
        key: 'quantity',
        label: 'Quantity',
        format: (val) => {
          const num = typeof val === 'string' ? parseFloat(val) : val;
          return new Intl.NumberFormat('en-ZA', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
          }).format(num || 0);
        }
      }
    ]
  },
  actions: {
    canEdit: true,
    canDelete: false,
    customActions: [
      {
        label: 'Ship',
        icon: Truck,
        color: '#10b981',
        condition: (doc) => doc.status === 'draft',
        onClick: async (doc, reload) => {
          try {
            await api.post(`/erp/order-to-cash/deliveries/${doc.id}/ship`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to ship delivery');
          }
        }
      },
      {
        label: 'Cancel',
        icon: XCircle,
        color: '#ef4444',
        condition: (doc) => doc.status === 'draft' || doc.status === 'pending',
        onClick: async (doc, reload) => {
          const reason = prompt('Enter cancellation reason (optional):');
          if (reason === null) return;
          
          try {
            await api.post(`/erp/order-to-cash/deliveries/${doc.id}/cancel`, {
              reason: reason || 'User cancelled'
            });
            alert(`Delivery ${doc.delivery_number} cancelled successfully`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to cancel delivery');
          }
        }
      }
    ]
  }
};

export default function DeliveryDetail() {
  return <DocumentDetail config={config} />;
}
