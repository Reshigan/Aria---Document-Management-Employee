import React, { useState } from 'react';
import { Phone, Mail, AlertTriangle, CheckCircle, Clock, DollarSign, Users } from 'lucide-react';

interface CollectionItem {
  id: number;
  customer: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  days_overdue: number;
  last_contact: string;
  status: 'CURRENT' | 'OVERDUE_30' | 'OVERDUE_60' | 'OVERDUE_90' | 'COLLECTED' | 'WRITTEN_OFF';
  notes: string;
}

const Collections: React.FC = () => {
  const [collections, setCollections] = useState<CollectionItem[]>([
    { id: 1, customer: 'ABC Trading', invoice_number: 'INV-2025-0145', invoice_date: '2025-11-15', due_date: '2025-12-15', amount: 45000, days_overdue: 37, last_contact: '2026-01-10', status: 'OVERDUE_30', notes: 'Promised payment by 20th' },
    { id: 2, customer: 'XYZ Corp', invoice_number: 'INV-2025-0152', invoice_date: '2025-10-20', due_date: '2025-11-20', amount: 82000, days_overdue: 62, last_contact: '2026-01-08', status: 'OVERDUE_60', notes: 'Dispute on quantity' },
    { id: 3, customer: 'Global Industries', invoice_number: 'INV-2025-0160', invoice_date: '2025-09-10', due_date: '2025-10-10', amount: 125000, days_overdue: 103, last_contact: '2026-01-05', status: 'OVERDUE_90', notes: 'Legal action pending' },
    { id: 4, customer: 'Local Supplies', invoice_number: 'INV-2026-0008', invoice_date: '2026-01-05', due_date: '2026-02-05', amount: 28000, days_overdue: 0, last_contact: '-', status: 'CURRENT', notes: '' },
    { id: 5, customer: 'Metro Services', invoice_number: 'INV-2025-0148', invoice_date: '2025-11-25', due_date: '2025-12-25', amount: 35000, days_overdue: 0, last_contact: '2026-01-15', status: 'COLLECTED', notes: 'Paid in full' },
  ]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      CURRENT: { bg: '#dcfce7', text: '#166534', label: 'Current' },
      OVERDUE_30: { bg: '#fef3c7', text: '#92400e', label: '30+ Days' },
      OVERDUE_60: { bg: '#fed7aa', text: '#c2410c', label: '60+ Days' },
      OVERDUE_90: { bg: '#fee2e2', text: '#991b1b', label: '90+ Days' },
      COLLECTED: { bg: '#dbeafe', text: '#1e40af', label: 'Collected' },
      WRITTEN_OFF: { bg: '#f3f4f6', text: '#374151', label: 'Written Off' }
    };
    const c = config[status] || config.CURRENT;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.label}</span>;
  };

  const overdue30 = collections.filter(c => c.status === 'OVERDUE_30').reduce((acc, c) => acc + c.amount, 0);
  const overdue60 = collections.filter(c => c.status === 'OVERDUE_60').reduce((acc, c) => acc + c.amount, 0);
  const overdue90 = collections.filter(c => c.status === 'OVERDUE_90').reduce((acc, c) => acc + c.amount, 0);
  const totalOverdue = overdue30 + overdue60 + overdue90;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Collections</h1>
        <p style={{ color: '#6b7280' }}>Manage accounts receivable collections and follow-ups</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Overdue</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(totalOverdue)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>30+ Days</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(overdue30)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fed7aa', borderRadius: '10px' }}><Clock size={24} style={{ color: '#ea580c' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>60+ Days</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ea580c' }}>{formatCurrency(overdue60)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#dc2626' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>90+ Days</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(overdue90)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Collection Queue</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Invoice</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Due Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Days Overdue</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Last Contact</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.customer}</div>
                  {item.notes && <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.notes}</div>}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#2563eb', fontWeight: 600 }}>{item.invoice_number}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{item.due_date}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, textAlign: 'center', color: item.days_overdue > 60 ? '#ef4444' : item.days_overdue > 30 ? '#f59e0b' : '#10b981' }}>
                  {item.days_overdue > 0 ? item.days_overdue : '-'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{item.last_contact}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(item.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '6px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} title="Call"><Phone size={16} /></button>
                  <button style={{ padding: '6px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} title="Email"><Mail size={16} /></button>
                  <button style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }} title="Mark Collected"><CheckCircle size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Collections;
