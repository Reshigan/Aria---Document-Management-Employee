import { DocumentDetail, DocumentDetailConfig } from '../../../components/DocumentDetail/DocumentDetail';
import api from '../../../lib/api';
import { Check, Truck, FileText, XCircle } from 'lucide-react';

const config: DocumentDetailConfig = {
  title: 'Sales Order',
  apiPath: '/erp/order-to-cash/sales-orders',
  listPath: '/sales-orders',
  fields: {
    number: 'order_number',
    date: 'order_date',
    status: 'status',
    party: 'customer_name',
    partyLabel: 'Customer',
    reference: 'quote_id',
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
            await api.post(`/erp/order-to-cash/sales-orders/${doc.id}/approve`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to approve sales order');
          }
        }
      },
      {
        label: 'Create Delivery',
        icon: Truck,
        color: '#3b82f6',
        condition: (doc) => doc.status === 'approved',
        onClick: async (doc, reload) => {
          try {
            const deliveryLines = (doc.lines || [])
              .filter((line: any) => {
                const qtyOutstanding = parseFloat(line.quantity) - parseFloat(line.quantity_delivered || 0);
                return qtyOutstanding > 0;
              })
              .map((line: any, idx: number) => ({
                line_number: idx + 1,
                sales_order_line_id: line.id,
                product_id: line.product_id,
                description: line.description,
                quantity: parseFloat(line.quantity) - parseFloat(line.quantity_delivered || 0)
              }));

            if (deliveryLines.length === 0) {
              alert('No outstanding quantities to deliver');
              return;
            }

            const deliveryPayload = {
              sales_order_id: doc.id,
              customer_id: doc.customer_id,
              warehouse_id: doc.warehouse_id,
              delivery_date: new Date().toISOString().split('T')[0],
              notes: `Delivery for ${doc.order_number}`,
              lines: deliveryLines
            };

            const response = await api.post('/erp/order-to-cash/deliveries', deliveryPayload);
            alert(`Delivery ${response.data.delivery_number} created successfully!`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to create delivery');
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
            await api.post(`/erp/order-to-cash/sales-orders/${doc.id}/cancel`, {
              reason: reason || 'User cancelled'
            });
            alert(`Sales order ${doc.order_number} cancelled successfully`);
            reload();
          } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to cancel sales order');
          }
        }
      }
    ]
  }
};

export default function SalesOrderDetail() {
  return <DocumentDetail config={config} />;
}
