import React, { useState } from 'react';
import { Building2, FileText, Package, DollarSign, Bell, Clock, CheckCircle, Eye } from 'lucide-react';

interface PortalItem {
  id: number;
  type: 'PO' | 'RFQ' | 'INVOICE' | 'CONTRACT';
  reference: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  action_required: boolean;
}

const SupplierPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'invoices' | 'rfqs'>('overview');
  const [items] = useState<PortalItem[]>([
    { id: 1, type: 'PO', reference: 'PO-2026-0125', description: 'Office Supplies Order', amount: 15000, date: '2026-01-20', status: 'PENDING_CONFIRMATION', action_required: true },
    { id: 2, type: 'RFQ', reference: 'RFQ-2026-002', description: 'IT Equipment Procurement', amount: 450000, date: '2026-01-30', status: 'AWAITING_RESPONSE', action_required: true },
    { id: 3, type: 'INVOICE', reference: 'INV-2026-0089', description: 'January Services', amount: 28500, date: '2026-01-15', status: 'PAID', action_required: false },
    { id: 4, type: 'CONTRACT', reference: 'CON-2026-001', description: 'Annual Service Agreement', amount: 480000, date: '2026-12-31', status: 'ACTIVE', action_required: false },
    { id: 5, type: 'PO', reference: 'PO-2026-0118', description: 'Raw Materials Batch', amount: 85000, date: '2026-01-18', status: 'CONFIRMED', action_required: false },
  ]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      PENDING_CONFIRMATION: { bg: '#fef3c7', text: '#92400e' },
      AWAITING_RESPONSE: { bg: '#dbeafe', text: '#1e40af' },
      CONFIRMED: { bg: '#dcfce7', text: '#166534' },
      PAID: { bg: '#dcfce7', text: '#166534' },
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      OVERDUE: { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status.replace('_', ' ')}</span>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PO': return <Package size={16} style={{ color: '#2563eb' }} />;
      case 'RFQ': return <FileText size={16} style={{ color: '#f59e0b' }} />;
      case 'INVOICE': return <DollarSign size={16} style={{ color: '#10b981' }} />;
      case 'CONTRACT': return <FileText size={16} style={{ color: '#6366f1' }} />;
      default: return <FileText size={16} />;
    }
  };

  const pendingActions = items.filter(i => i.action_required).length;
  const totalOrders = items.filter(i => i.type === 'PO').length;
  const totalInvoices = items.filter(i => i.type === 'INVOICE').reduce((acc, i) => acc + i.amount, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Supplier Portal</h1>
        <p style={{ color: '#6b7280' }}>Self-service portal for supplier interactions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><Bell size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Actions Required</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{pendingActions}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px' }}><Package size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active Orders</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{totalOrders}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>YTD Invoiced</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalInvoices)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><Building2 size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active Contracts</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{items.filter(i => i.type === 'CONTRACT').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {(['overview', 'orders', 'invoices', 'rfqs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '16px 24px',
                border: 'none',
                background: 'none',
                fontSize: '14px',
                fontWeight: 600,
                color: activeTab === tab ? '#2563eb' : '#6b7280',
                borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Recent Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: item.action_required ? '#fef3c7' : '#f9fafb', borderRadius: '8px', border: item.action_required ? '1px solid #fcd34d' : '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {getTypeIcon(item.type)}
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.reference}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.description}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{formatCurrency(item.amount)}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.date}</div>
                      </div>
                      {getStatusBadge(item.status)}
                      {item.action_required && (
                        <button style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                          Take Action
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Purchase Orders</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>PO Number</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Description</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(i => i.type === 'PO').map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{item.reference}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>{item.description}</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{item.date}</td>
                      <td style={{ padding: '12px' }}>{getStatusBadge(item.status)}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                        {item.action_required && <button style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Confirm</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Invoices</h3>
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                <DollarSign size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p>Submit invoices against confirmed purchase orders</p>
                <button style={{ marginTop: '16px', padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  Submit Invoice
                </button>
              </div>
            </div>
          )}

          {activeTab === 'rfqs' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Request for Quotations</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>RFQ Number</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Description</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Deadline</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(i => i.type === 'RFQ').map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{item.reference}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>{item.description}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{item.date}</td>
                      <td style={{ padding: '12px' }}>{getStatusBadge(item.status)}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                          Submit Quote
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierPortal;
