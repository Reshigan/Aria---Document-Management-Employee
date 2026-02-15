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
  const { id } = useParams<{ id: string }>();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
      <DocumentDetail config={config} key={refreshKey} />
      
      {id && (
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Comments & Activity
            </h2>
            <CommentSection documentType="deliveries" documentId={id} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Attachments
            </h2>
            <AttachmentUpload documentType="deliveries" documentId={id} />
          </div>
        </div>
      )}
    </div>
  );
}
