import { DocumentDetail, DocumentDetailConfig } from '../../../components/DocumentDetail/DocumentDetail';
import api from '../../../lib/api';
import { Check, Package, XCircle } from 'lucide-react';
import { CommentSection } from '../../../components/Comments/CommentSection';
import { AttachmentUpload } from '../../../components/DocumentAttachments/AttachmentUpload';
import { ApprovalPanel } from '../../../components/ApprovalWorkflow/ApprovalPanel';
import { useParams } from 'react-router-dom';
import { useState } from 'react';

const config: DocumentDetailConfig = {
  title: 'Purchase Order',
  apiPath: '/erp/procure-to-pay/purchase-orders',
  listPath: '/procurement/purchase-orders',
  fields: {
    number: 'po_number',
    date: 'order_date',
    status: 'status',
    party: 'supplier_name',
    partyLabel: 'Supplier',
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
            await api.post(`/erp/procure-to-pay/purchase-orders/${doc.id}/approve`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to approve purchase order');
          }
        }
      },
      {
        label: 'Create Goods Receipt',
        icon: Package,
        color: '#3b82f6',
        condition: (doc) => doc.status === 'approved',
        onClick: async (doc, reload) => {
          try {
            const response = await api.post('/erp/procure-to-pay/goods-receipts', {
              purchase_order_id: doc.id
            });
            alert(`Goods Receipt ${response.data.gr_number} created successfully!`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to create goods receipt');
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
            await api.post(`/erp/procure-to-pay/purchase-orders/${doc.id}/cancel`, {
              reason: reason || 'User cancelled'
            });
            alert(`Purchase order ${doc.po_number} cancelled successfully`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to cancel purchase order');
          }
        }
      }
    ]
  }
};

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStatusChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div>
      <DocumentDetail config={config} key={refreshKey} />
      
      {id && (
        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Comments & Activity
            </h2>
            <CommentSection documentType="purchase_orders" documentId={id} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                Attachments
              </h2>
              <AttachmentUpload documentType="purchase_orders" documentId={id} />
            </div>

            <div style={{
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                Approval Workflow
              </h2>
              <ApprovalPanel 
                documentType="purchase_orders" 
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
