import React, { useState } from 'react';
import { Plus, Edit2, Eye, Send, FileText, Users, Clock, CheckCircle } from 'lucide-react';

interface RFQ {
  id: number;
  reference: string;
  title: string;
  description: string;
  suppliers_invited: number;
  responses_received: number;
  deadline: string;
  created_date: string;
  total_value: number;
  status: 'DRAFT' | 'SENT' | 'EVALUATING' | 'AWARDED' | 'CANCELLED';
}

const RFQs: React.FC = () => {
  const [rfqs, setRfqs] = useState<RFQ[]>([
    { id: 1, reference: 'RFQ-2026-001', title: 'Office Furniture Supply', description: 'Desks, chairs, and storage units for new office', suppliers_invited: 5, responses_received: 4, deadline: '2026-01-25', created_date: '2026-01-10', total_value: 250000, status: 'EVALUATING' },
    { id: 2, reference: 'RFQ-2026-002', title: 'IT Equipment Procurement', description: 'Laptops, monitors, and peripherals', suppliers_invited: 8, responses_received: 6, deadline: '2026-01-30', created_date: '2026-01-15', total_value: 450000, status: 'SENT' },
    { id: 3, reference: 'RFQ-2026-003', title: 'Raw Materials Q1 2026', description: 'Steel, aluminum, and plastics for manufacturing', suppliers_invited: 4, responses_received: 4, deadline: '2026-01-20', created_date: '2026-01-05', total_value: 850000, status: 'AWARDED' },
    { id: 4, reference: 'RFQ-2026-004', title: 'Cleaning Services Contract', description: 'Annual cleaning services for all facilities', suppliers_invited: 6, responses_received: 0, deadline: '2026-02-15', created_date: '2026-01-20', total_value: 180000, status: 'DRAFT' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', deadline: '', suppliers_invited: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      SENT: { bg: '#dbeafe', text: '#1e40af' },
      EVALUATING: { bg: '#fef3c7', text: '#92400e' },
      AWARDED: { bg: '#dcfce7', text: '#166534' },
      CANCELLED: { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const handleCreate = () => {
    setForm({ title: '', description: '', deadline: '', suppliers_invited: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newRFQ: RFQ = {
      id: Date.now(),
      reference: `RFQ-2026-${String(rfqs.length + 1).padStart(3, '0')}`,
      title: form.title,
      description: form.description,
      suppliers_invited: parseInt(form.suppliers_invited) || 0,
      responses_received: 0,
      deadline: form.deadline,
      created_date: new Date().toISOString().split('T')[0],
      total_value: 0,
      status: 'DRAFT'
    };
    setRfqs([newRFQ, ...rfqs]);
    setShowModal(false);
  };

  const handleSend = (id: number) => setRfqs(rfqs.map(r => r.id === id ? { ...r, status: 'SENT' as const } : r));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Request for Quotations</h1>
        <p style={{ color: '#6b7280' }}>Create and manage RFQs for competitive bidding</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><FileText size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total RFQs</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{rfqs.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px' }}><Send size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{rfqs.filter(r => r.status === 'SENT').length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Evaluating</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{rfqs.filter(r => r.status === 'EVALUATING').length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Awarded</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{rfqs.filter(r => r.status === 'AWARDED').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>RFQ List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New RFQ
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Title</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Suppliers</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Responses</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Deadline</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Est. Value</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rfqs.map((rfq) => (
              <tr key={rfq.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{rfq.reference}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{rfq.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{rfq.description.slice(0, 50)}...</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{rfq.suppliers_invited}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: rfq.responses_received > 0 ? '#10b981' : '#6b7280', textAlign: 'center' }}>{rfq.responses_received}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{rfq.deadline}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(rfq.total_value)}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(rfq.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                  {rfq.status === 'DRAFT' && (
                    <button onClick={() => handleSend(rfq.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Send</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New RFQ</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description *</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Deadline *</label>
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Suppliers to Invite</label>
                  <input type="number" value={form.suppliers_invited} onChange={(e) => setForm({ ...form, suppliers_invited: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
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

export default RFQs;
