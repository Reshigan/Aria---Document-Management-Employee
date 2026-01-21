import React, { useState } from 'react';
import { Plus, Edit2, DollarSign, Users, TrendingUp, Calendar } from 'lucide-react';

interface Commission {
  id: number;
  sales_rep: string;
  period: string;
  sales_amount: number;
  commission_rate: number;
  commission_amount: number;
  bonus: number;
  total_earnings: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
}

const Commissions: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([
    { id: 1, sales_rep: 'Sarah Johnson', period: 'January 2026', sales_amount: 850000, commission_rate: 5, commission_amount: 42500, bonus: 5000, total_earnings: 47500, status: 'PAID' },
    { id: 2, sales_rep: 'Mike Brown', period: 'January 2026', sales_amount: 620000, commission_rate: 5, commission_amount: 31000, bonus: 0, total_earnings: 31000, status: 'APPROVED' },
    { id: 3, sales_rep: 'Tom Wilson', period: 'January 2026', sales_amount: 380000, commission_rate: 4, commission_amount: 15200, bonus: 0, total_earnings: 15200, status: 'APPROVED' },
    { id: 4, sales_rep: 'Lisa Davis', period: 'January 2026', sales_amount: 920000, commission_rate: 5, commission_amount: 46000, bonus: 8000, total_earnings: 54000, status: 'PENDING' },
    { id: 5, sales_rep: 'Sarah Johnson', period: 'December 2025', sales_amount: 780000, commission_rate: 5, commission_amount: 39000, bonus: 3000, total_earnings: 42000, status: 'PAID' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ sales_rep: '', period: '', sales_amount: '', commission_rate: '5' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: '#fef3c7', text: '#92400e' },
      APPROVED: { bg: '#dbeafe', text: '#1e40af' },
      PAID: { bg: '#dcfce7', text: '#166534' }
    };
    const c = config[status] || config.PENDING;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const handleCreate = () => {
    setForm({ sales_rep: '', period: '', sales_amount: '', commission_rate: '5' });
    setShowModal(true);
  };

  const handleSave = () => {
    const salesAmount = parseFloat(form.sales_amount);
    const rate = parseFloat(form.commission_rate);
    const commissionAmount = salesAmount * (rate / 100);
    const newCommission: Commission = {
      id: Date.now(),
      sales_rep: form.sales_rep,
      period: form.period,
      sales_amount: salesAmount,
      commission_rate: rate,
      commission_amount: commissionAmount,
      bonus: 0,
      total_earnings: commissionAmount,
      status: 'PENDING'
    };
    setCommissions([newCommission, ...commissions]);
    setShowModal(false);
  };

  const handleApprove = (id: number) => setCommissions(commissions.map(c => c.id === id ? { ...c, status: 'APPROVED' as const } : c));
  const handlePay = (id: number) => setCommissions(commissions.map(c => c.id === id ? { ...c, status: 'PAID' as const } : c));

  const totalPending = commissions.filter(c => c.status === 'PENDING').reduce((acc, c) => acc + c.total_earnings, 0);
  const totalApproved = commissions.filter(c => c.status === 'APPROVED').reduce((acc, c) => acc + c.total_earnings, 0);
  const totalPaid = commissions.filter(c => c.status === 'PAID').reduce((acc, c) => acc + c.total_earnings, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Commissions</h1>
        <p style={{ color: '#6b7280' }}>Calculate and manage sales commissions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(totalPending)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Approved</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(totalApproved)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Paid (MTD)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalPaid)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Users size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Sales Reps</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{new Set(commissions.map(c => c.sales_rep)).size}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Commission Records</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Add Commission
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Sales Rep</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Sales</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Rate</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Commission</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Bonus</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((comm) => (
              <tr key={comm.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{comm.sales_rep}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{comm.period}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>{formatCurrency(comm.sales_amount)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{comm.commission_rate}%</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>{formatCurrency(comm.commission_amount)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: comm.bonus > 0 ? '#10b981' : '#6b7280', textAlign: 'right' }}>{formatCurrency(comm.bonus)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(comm.total_earnings)}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(comm.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  {comm.status === 'PENDING' && (
                    <button onClick={() => handleApprove(comm.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
                  )}
                  {comm.status === 'APPROVED' && (
                    <button onClick={() => handlePay(comm.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Pay</button>
                  )}
                  <button style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Add Commission</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Sales Rep *</label>
                  <select value={form.sales_rep} onChange={(e) => setForm({ ...form, sales_rep: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Rep</option>
                    <option value="Sarah Johnson">Sarah Johnson</option>
                    <option value="Mike Brown">Mike Brown</option>
                    <option value="Tom Wilson">Tom Wilson</option>
                    <option value="Lisa Davis">Lisa Davis</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Period *</label>
                  <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Period</option>
                    <option value="January 2026">January 2026</option>
                    <option value="February 2026">February 2026</option>
                    <option value="March 2026">March 2026</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Sales Amount (ZAR) *</label>
                  <input type="number" value={form.sales_amount} onChange={(e) => setForm({ ...form, sales_amount: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Rate (%)</label>
                  <input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commissions;
