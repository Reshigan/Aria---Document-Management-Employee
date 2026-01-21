import React, { useState } from 'react';
import { Plus, Eye, FileText, Send, Download } from 'lucide-react';

interface CreditNote {
  id: number;
  credit_note_number: string;
  customer: string;
  invoice_reference: string;
  date: string;
  amount: number;
  reason: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'APPLIED';
}

const CreditNotes: React.FC = () => {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([
    { id: 1, credit_note_number: 'CN-2026-001', customer: 'ABC Trading', invoice_reference: 'INV-2025-0145', date: '2026-01-10', amount: 5000, reason: 'Goods returned - damaged', status: 'APPLIED' },
    { id: 2, credit_note_number: 'CN-2026-002', customer: 'XYZ Corp', invoice_reference: 'INV-2025-0152', date: '2026-01-12', amount: 2500, reason: 'Price adjustment', status: 'SENT' },
    { id: 3, credit_note_number: 'CN-2026-003', customer: 'Global Industries', invoice_reference: 'INV-2026-0008', date: '2026-01-15', amount: 8500, reason: 'Quantity discrepancy', status: 'APPROVED' },
    { id: 4, credit_note_number: 'CN-2026-004', customer: 'Local Supplies', invoice_reference: 'INV-2026-0012', date: '2026-01-18', amount: 1200, reason: 'Service credit', status: 'DRAFT' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customer: '', invoice_reference: '', amount: '', reason: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      APPROVED: { bg: '#dbeafe', text: '#1e40af' },
      SENT: { bg: '#fef3c7', text: '#92400e' },
      APPLIED: { bg: '#dcfce7', text: '#166534' }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const handleCreate = () => {
    setForm({ customer: '', invoice_reference: '', amount: '', reason: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newCN: CreditNote = {
      id: Date.now(),
      credit_note_number: `CN-2026-${String(creditNotes.length + 1).padStart(3, '0')}`,
      customer: form.customer,
      invoice_reference: form.invoice_reference,
      date: new Date().toISOString().split('T')[0],
      amount: parseFloat(form.amount),
      reason: form.reason,
      status: 'DRAFT'
    };
    setCreditNotes([newCN, ...creditNotes]);
    setShowModal(false);
  };

  const totalDraft = creditNotes.filter(c => c.status === 'DRAFT').reduce((acc, c) => acc + c.amount, 0);
  const totalApplied = creditNotes.filter(c => c.status === 'APPLIED').reduce((acc, c) => acc + c.amount, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Credit Notes</h1>
        <p style={{ color: '#6b7280' }}>Issue and manage customer credit notes</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Credit Notes</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{creditNotes.length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Draft Amount</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(totalDraft)}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Applied Amount</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalApplied)}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>This Month</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{creditNotes.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Credit Note List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Credit Note
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Credit Note #</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Invoice Ref</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reason</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {creditNotes.map((cn) => (
              <tr key={cn.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{cn.credit_note_number}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{cn.customer}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{cn.invoice_reference}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{cn.date}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#ef4444', textAlign: 'right' }}>-{formatCurrency(cn.amount)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{cn.reason}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(cn.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Send size={16} /></button>
                  <button style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Download size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Credit Note</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Customer *</label>
                <input type="text" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Invoice Reference *</label>
                  <input type="text" value={form.invoice_reference} onChange={(e) => setForm({ ...form, invoice_reference: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Amount (ZAR) *</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Reason *</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditNotes;
