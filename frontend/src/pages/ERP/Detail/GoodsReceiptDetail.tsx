import { DocumentDetail, DocumentDetailConfig } from '../../../components/DocumentDetail/DocumentDetail';
import api from '../../../lib/api';
import { Package, XCircle } from 'lucide-react';

const config: DocumentDetailConfig = {
  title: 'Goods Receipt',
  apiPath: '/erp/procure-to-pay/goods-receipts',
  listPath: '/procurement/goods-receipts',
  fields: {
    number: 'gr_number',
    date: 'receipt_date',
    status: 'status',
    party: 'supplier_name',
    partyLabel: 'Supplier',
    reference: 'purchase_order_id',
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
        label: 'Post',
        icon: Package,
        color: '#10b981',
        condition: (doc) => doc.status === 'draft',
        onClick: async (doc, reload) => {
          try {
            await api.post(`/erp/procure-to-pay/goods-receipts/${doc.id}/post`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to post goods receipt');
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
            await api.post(`/erp/procure-to-pay/goods-receipts/${doc.id}/cancel`, {
              reason: reason || 'User cancelled'
            });
            alert(`Goods receipt ${doc.receipt_number} cancelled successfully`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to cancel goods receipt');
          }
        }
      }
    ]
  }
};

export default function GoodsReceiptDetail() {
  return <DocumentDetail config={config} />;
}
