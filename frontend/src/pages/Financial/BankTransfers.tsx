import React, { useState } from 'react';
import { Plus, ArrowRight, CheckCircle, Clock, XCircle, Building2 } from 'lucide-react';

interface BankTransfer {
  id: number;
  reference: string;
  from_account: string;
  to_account: string;
  amount: number;
  date: string;
  description: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_by: string;
}

const BankTransfers: React.FC = () => {
  const [transfers, setTransfers] = useState<BankTransfer[]>([
    { id: 1, reference: 'TRF-2026-001', from_account: 'FNB Current - 6234****5678', to_account: 'FNB Savings - 6234****9012', amount: 500000, date: '2026-01-15', description: 'Monthly savings transfer', status: 'COMPLETED', created_by: 'John Smith' },
    { id: 2, reference: 'TRF-2026-002', from_account: 'FNB Current - 6234****5678', to_account: 'Standard Bank - 0012****3456', amount: 250000, date: '2026-01-18', description: 'Supplier payment account funding', status: 'COMPLETED', created_by: 'Sarah Johnson' },
    { id: 3, reference: 'TRF-2026-003', from_account: 'FNB Savings - 6234****9012', to_account: 'FNB Current - 6234****5678', amount: 150000, date: '2026-01-20', description: 'Working capital top-up', status: 'PROCESSING', created_by: 'Mike Brown' },
    { id: 4, reference: 'TRF-2026-004', from_account: 'FNB Current - 6234****5678', to_account: 'Nedbank - 1234****5678', amount: 75000, date: '2026-01-21', description: 'Petty cash funding', status: 'PENDING', created_by: 'Lisa Davis' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ from_account: '', to_account: '', amount: '', description: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      PENDING: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> },
      PROCESSING: { bg: '#dbeafe', text: '#1e40af', icon: <Clock size={14} /> },
      COMPLETED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      FAILED: { bg: '#fee2e2', text: '#991b1b', icon: <XCircle size={14} /> }
    };
    const c = config[status] || config.PENDING;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>
        {c.icon} {status}
      </span>
    );
  };

  const handleCreate = () => {
    setForm({ from_account: '', to_account: '', amount: '', description: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newTransfer: BankTransfer = {
      id: Date.now(),
      reference: `TRF-2026-${String(transfers.length + 1).padStart(3, '0')}`,
      from_account: form.from_account,
      to_account: form.to_account,
      amount: parseFloat(form.amount),
      date: new Date().toISOString().split('T')[0],
      description: form.description,
      status: 'PENDING',
      created_by: 'Current User'
    };
    setTransfers([newTransfer, ...transfers]);
    setShowModal(false);
  };

  const accounts = [
    'FNB Current - 6234****5678',
    'FNB Savings - 6234****9012',
    'Standard Bank - 0012****3456',
    'Nedbank - 1234****5678'
  ];

  const totalPending = transfers.filter(t => t.status === 'PENDING').reduce((acc, t) => acc + t.amount, 0);
  const totalCompleted = transfers.filter(t => t.status === 'COMPLETED').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Bank Transfers</h1>
        <p style={{ color: '#6b7280' }}>Transfer funds between bank accounts</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Building2 size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Transfers</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{transfers.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(totalPending)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Completed</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalCompleted)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f3e8ff', borderRadius: '10px' }}><Building2 size={24} style={{ color: '#9333ea' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Linked Accounts</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{accounts.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Transfer History</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Transfer
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>From / To</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{transfer.reference}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#111827' }}>{transfer.from_account}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>From</div>
                    </div>
                    <ArrowRight size={16} style={{ color: '#6b7280' }} />
                    <div>
                      <div style={{ fontSize: '14px', color: '#111827' }}>{transfer.to_account}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>To</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(transfer.amount)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{transfer.date}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{transfer.description}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(transfer.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Bank Transfer</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>From Account *</label>
                <select value={form.from_account} onChange={(e) => setForm({ ...form, from_account: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="">Select Account</option>
                  {accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>To Account *</label>
                <select value={form.to_account} onChange={(e) => setForm({ ...form, to_account: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="">Select Account</option>
                  {accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Amount (ZAR) *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description *</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Create Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankTransfers;
