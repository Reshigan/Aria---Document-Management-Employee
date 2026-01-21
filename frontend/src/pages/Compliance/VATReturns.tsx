import React, { useState } from 'react';
import { FileText, Download, Upload, CheckCircle, Clock, AlertTriangle, Calendar, DollarSign } from 'lucide-react';

interface VATReturn {
  id: number;
  period: string;
  reference: string;
  output_vat: number;
  input_vat: number;
  net_vat: number;
  taxable_supplies: number;
  zero_rated: number;
  exempt: number;
  due_date: string;
  submitted_date: string | null;
  payment_date: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'PAID' | 'OVERDUE' | 'REFUND_PENDING';
}

const VATReturns: React.FC = () => {
  const [returns, setReturns] = useState<VATReturn[]>([
    { id: 1, period: 'Nov-Dec 2025', reference: 'VAT201-2025-06', output_vat: 425000, input_vat: 285000, net_vat: 140000, taxable_supplies: 2833333, zero_rated: 150000, exempt: 50000, due_date: '2026-01-25', submitted_date: null, payment_date: null, status: 'DRAFT' },
    { id: 2, period: 'Sep-Oct 2025', reference: 'VAT201-2025-05', output_vat: 398000, input_vat: 312000, net_vat: 86000, taxable_supplies: 2653333, zero_rated: 120000, exempt: 45000, due_date: '2025-11-25', submitted_date: '2025-11-22', payment_date: '2025-11-24', status: 'PAID' },
    { id: 3, period: 'Jul-Aug 2025', reference: 'VAT201-2025-04', output_vat: 385000, input_vat: 420000, net_vat: -35000, taxable_supplies: 2566667, zero_rated: 180000, exempt: 40000, due_date: '2025-09-25', submitted_date: '2025-09-20', payment_date: null, status: 'REFUND_PENDING' },
    { id: 4, period: 'May-Jun 2025', reference: 'VAT201-2025-03', output_vat: 412000, input_vat: 295000, net_vat: 117000, taxable_supplies: 2746667, zero_rated: 140000, exempt: 35000, due_date: '2025-07-25', submitted_date: '2025-07-23', payment_date: '2025-07-24', status: 'PAID' },
  ]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151', icon: <FileText size={14} /> },
      SUBMITTED: { bg: '#dbeafe', text: '#1e40af', icon: <Clock size={14} /> },
      PAID: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      OVERDUE: { bg: '#fee2e2', text: '#991b1b', icon: <AlertTriangle size={14} /> },
      REFUND_PENDING: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status.replace('_', ' ')}</span>;
  };

  const handleSubmit = (id: number) => {
    setReturns(returns.map(r => r.id === id ? { ...r, status: 'SUBMITTED' as const, submitted_date: new Date().toISOString().split('T')[0] } : r));
  };

  const handlePay = (id: number) => {
    setReturns(returns.map(r => r.id === id ? { ...r, status: 'PAID' as const, payment_date: new Date().toISOString().split('T')[0] } : r));
  };

  const currentReturn = returns.find(r => r.status === 'DRAFT');
  const ytdOutput = returns.filter(r => r.status === 'PAID').reduce((acc, r) => acc + r.output_vat, 0);
  const ytdInput = returns.filter(r => r.status === 'PAID').reduce((acc, r) => acc + r.input_vat, 0);
  const ytdNet = returns.filter(r => r.status === 'PAID').reduce((acc, r) => acc + r.net_vat, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>VAT Returns (VAT201)</h1>
        <p style={{ color: '#6b7280' }}>Bi-monthly Value Added Tax returns to SARS</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Current Period</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{currentReturn?.period || 'N/A'}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Current Net VAT</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: currentReturn && currentReturn.net_vat < 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(currentReturn?.net_vat || 0)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>YTD Output VAT</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(ytdOutput)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><FileText size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>YTD Net Paid</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{formatCurrency(ytdNet)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>VAT Information</h4>
        <ul style={{ fontSize: '14px', color: '#1e40af', margin: 0, paddingLeft: '20px' }}>
          <li>Standard VAT rate: 15%</li>
          <li>VAT returns due by the 25th of the month following the tax period</li>
          <li>Bi-monthly filing: Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec</li>
          <li>Refunds processed within 21 business days of submission</li>
        </ul>
      </div>

      {currentReturn && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>Current Period: {currentReturn.period}</h3>
              <p style={{ fontSize: '14px', color: '#b45309' }}>Due date: {currentReturn.due_date} | Net VAT: {formatCurrency(currentReturn.net_vat)}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                <Download size={16} /> Download VAT201
              </button>
              <button onClick={() => handleSubmit(currentReturn.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                <Upload size={16} /> Submit to SARS
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Return History</h2>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Taxable Supplies</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Output VAT</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Input VAT</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Net VAT</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Due Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((ret) => (
              <tr key={ret.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{ret.period}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{ret.reference}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{formatCurrency(ret.taxable_supplies)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{formatCurrency(ret.output_vat)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{formatCurrency(ret.input_vat)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', color: ret.net_vat < 0 ? '#10b981' : '#ef4444', textAlign: 'right' }}>{formatCurrency(ret.net_vat)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{ret.due_date}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(ret.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Download size={16} /></button>
                  {ret.status === 'SUBMITTED' && ret.net_vat > 0 && (
                    <button onClick={() => handlePay(ret.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VATReturns;
