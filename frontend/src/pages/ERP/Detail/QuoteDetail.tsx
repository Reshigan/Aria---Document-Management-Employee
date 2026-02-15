import { DocumentDetail, DocumentDetailConfig } from '../../../components/DocumentDetail/DocumentDetail';
import api from '../../../lib/api';
import { Check, FileText, XCircle } from 'lucide-react';
import { CommentSection } from '../../../components/Comments/CommentSection';
import { AttachmentUpload } from '../../../components/DocumentAttachments/AttachmentUpload';
import { ApprovalPanel } from '../../../components/ApprovalWorkflow/ApprovalPanel';
import { useParams } from 'react-router-dom';
import { useState } from 'react';

const config: DocumentDetailConfig = {
  title: 'Quote',
  apiPath: '/erp/order-to-cash/quotes',
  listPath: '/quotes',
  fields: {
    number: 'quote_number',
    date: 'quote_date',
    status: 'status',
    party: 'customer_name',
    partyLabel: 'Customer',
    subtotal: 'subtotal',
    taxAmount: 'tax_amount',
    totalAmount: 'total_amount',
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
      },
      {
        key: 'unit_price',
        label: 'Unit Price',
        format: (val) => {
          const num = typeof val === 'string' ? parseFloat(val) : val;
          return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR'
          }).format(num || 0);
        }
      },
      {
        key: 'discount_percent',
        label: 'Discount %',
        format: (val) => {
          const num = typeof val === 'string' ? parseFloat(val) : val;
          return `${num || 0}%`;
        }
      },
      {
        key: 'tax_rate',
        label: 'Tax %',
        format: (val) => {
          const num = typeof val === 'string' ? parseFloat(val) : val;
          return `${num || 0}%`;
        }
      },
      {
        key: 'line_total',
        label: 'Total',
        format: (val) => {
          const num = typeof val === 'string' ? parseFloat(val) : val;
          return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR'
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
        label: 'Approve',
        icon: Check,
        color: '#10b981',
        condition: (doc) => doc.status === 'draft',
        onClick: async (doc, reload) => {
          try {
            await api.post(`/erp/order-to-cash/quotes/${doc.id}/approve`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to approve quote');
          }
        }
      },
      {
        label: 'Convert to Sales Order',
        icon: FileText,
        color: '#3b82f6',
        condition: (doc) => doc.status === 'approved',
        onClick: async (doc, reload) => {
          try {
            const response = await api.post(`/erp/order-to-cash/quotes/${doc.id}/accept`);
            alert(`Sales Order ${response.data.order_number} created successfully!`);
            window.location.href = `/sales-orders/${response.data.id}`;
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to convert quote');
          }
        }
      },
      {
        label: 'Cancel',
        icon: XCircle,
        color: '#ef4444',
        condition: (doc) => doc.status === 'draft' || doc.status === 'approved',
        onClick: async (doc, reload) => {
          const reason = prompt('Enter cancellation reason (optional):');
          if (reason === null) return;
          
          try {
            await api.post(`/erp/order-to-cash/quotes/${doc.id}/cancel`, {
              reason: reason || 'User cancelled'
            });
            alert(`Quote ${doc.quote_number} cancelled successfully`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to cancel quote');
          }
        }
      }
    ]
  }
};

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStatusChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <DocumentDetail config={config} key={refreshKey} />
      
      {id && (
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Comments & Activity
            </h2>
            <CommentSection documentType="quotes" documentId={id} />
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Attachments
              </h2>
              <AttachmentUpload documentType="quotes" documentId={id} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Approval Workflow
              </h2>
              <ApprovalPanel 
                documentType="quotes" 
                documentId={id} 
                currentStatus="draft"
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
