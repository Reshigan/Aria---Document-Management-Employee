import React, { useState } from 'react';
import { Plus, Play, CheckCircle, XCircle, Clock, FileText, Download } from 'lucide-react';

interface PaymentBatch {
  id: number;
  batch_number: string;
  description: string;
  payment_date: string;
  total_amount: number;
  payment_count: number;
  status: 'DRAFT' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_by: string;
  created_at: string;
}

const PaymentBatches: React.FC = () => {
  const [batches, setBatches] = useState<PaymentBatch[]>([
    { id: 1, batch_number: 'PB-2026-001', description: 'Supplier Payments - January', payment_date: '2026-01-15', total_amount: 450000, payment_count: 12, status: 'COMPLETED', created_by: 'John Smith', created_at: '2026-01-14' },
    { id: 2, batch_number: 'PB-2026-002', description: 'Utility Bills', payment_date: '2026-01-20', total_amount: 85000, payment_count: 5, status: 'COMPLETED', created_by: 'Sarah Johnson', created_at: '2026-01-18' },
    { id: 3, batch_number: 'PB-2026-003', description: 'Contractor Payments', payment_date: '2026-01-25', total_amount: 320000, payment_count: 8, status: 'PROCESSING', created_by: 'Mike Brown', created_at: '2026-01-23' },
    { id: 4, batch_number: 'PB-2026-004', description: 'Supplier Payments - February', payment_date: '2026-02-01', total_amount: 520000, payment_count: 15, status: 'PENDING', created_by: 'John Smith', created_at: '2026-01-28' },
    { id: 5, batch_number: 'PB-2026-005', description: 'Ad-hoc Payments', payment_date: '2026-02-05', total_amount: 75000, payment_count: 3, status: 'DRAFT', created_by: 'Lisa Davis', created_at: '2026-01-30' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description: '', payment_date: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151', icon: <FileText size={14} /> },
      PENDING: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> },
      PROCESSING: { bg: '#dbeafe', text: '#1e40af', icon: <Play size={14} /> },
      COMPLETED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      FAILED: { bg: '#fee2e2', text: '#991b1b', icon: <XCircle size={14} /> }
    };
    const c = config[status] || config.DRAFT;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>
        {c.icon} {status}
      </span>
    );
  };

  const handleCreate = () => {
    setForm({ description: '', payment_date: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newBatch: PaymentBatch = {
      id: Date.now(),
      batch_number: `PB-2026-${String(batches.length + 1).padStart(3, '0')}`,
      description: form.description,
      payment_date: form.payment_date,
      total_amount: 0,
      payment_count: 0,
      status: 'DRAFT',
      created_by: 'Current User',
      created_at: new Date().toISOString().split('T')[0]
    };
    setBatches([newBatch, ...batches]);
    setShowModal(false);
  };

  const handleProcess = (id: number) => {
    setBatches(batches.map(b => b.id === id ? { ...b, status: 'PROCESSING' as const } : b));
    setTimeout(() => {
      setBatches(prev => prev.map(b => b.id === id ? { ...b, status: 'COMPLETED' as const } : b));
    }, 2000);
  };

  const totalPending = batches.filter(b => b.status === 'PENDING').reduce((acc, b) => acc + b.total_amount, 0);
  const totalProcessed = batches.filter(b => b.status === 'COMPLETED').reduce((acc, b) => acc + b.total_amount, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Payment Batches</h1>
        <p style={{ color: '#6b7280' }}>Create and process bulk payment batches</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Batches</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{batches.length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Pending Amount</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(totalPending)}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Processed Amount</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalProcessed)}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Processing</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{batches.filter(b => b.status === 'PROCESSING').length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Batch List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Batch
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Batch #</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Payment Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Payments</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{batch.batch_number}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>{batch.description}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{batch.payment_date}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(batch.total_amount)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{batch.payment_count}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(batch.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  {batch.status === 'PENDING' && (
                    <button onClick={() => handleProcess(batch.id)} style={{ padding: '4px 8px', marginRight: '8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Process
                    </button>
                  )}
                  {batch.status === 'COMPLETED' && (
                    <button style={{ padding: '4px 8px', fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Download size={16} />
                    </button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Payment Batch</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description *</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Payment Date *</label>
                <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Create Batch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentBatches;
