import React, { useState } from 'react';
import { Plus, Edit2, Eye, FileText, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

interface Contract {
  id: number;
  reference: string;
  title: string;
  supplier: string;
  contract_type: 'FIXED' | 'FRAMEWORK' | 'BLANKET' | 'SERVICE';
  start_date: string;
  end_date: string;
  total_value: number;
  spent_value: number;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED';
}

const Contracts: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([
    { id: 1, reference: 'CON-2026-001', title: 'IT Support Services', supplier: 'Tech Solutions Ltd', contract_type: 'SERVICE', start_date: '2026-01-01', end_date: '2026-12-31', total_value: 480000, spent_value: 40000, status: 'ACTIVE' },
    { id: 2, reference: 'CON-2026-002', title: 'Office Supplies Framework', supplier: 'Office Pro SA', contract_type: 'FRAMEWORK', start_date: '2026-01-01', end_date: '2027-12-31', total_value: 250000, spent_value: 15000, status: 'ACTIVE' },
    { id: 3, reference: 'CON-2025-015', title: 'Cleaning Services', supplier: 'CleanCo Services', contract_type: 'SERVICE', start_date: '2025-01-01', end_date: '2026-01-31', total_value: 180000, spent_value: 165000, status: 'EXPIRING' },
    { id: 4, reference: 'CON-2025-008', title: 'Raw Materials Supply', supplier: 'Global Materials', contract_type: 'BLANKET', start_date: '2025-06-01', end_date: '2025-12-31', total_value: 1200000, spent_value: 1200000, status: 'EXPIRED' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', supplier: '', contract_type: 'SERVICE', start_date: '', end_date: '', total_value: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151', icon: <FileText size={14} /> },
      ACTIVE: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      EXPIRING: { bg: '#fef3c7', text: '#92400e', icon: <AlertTriangle size={14} /> },
      EXPIRED: { bg: '#fee2e2', text: '#991b1b', icon: <Calendar size={14} /> },
      TERMINATED: { bg: '#f3f4f6', text: '#374151', icon: <FileText size={14} /> }
    };
    const c = config[status] || config.DRAFT;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status}</span>;
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      FIXED: { bg: '#dbeafe', text: '#1e40af' },
      FRAMEWORK: { bg: '#e0e7ff', text: '#3730a3' },
      BLANKET: { bg: '#fef3c7', text: '#92400e' },
      SERVICE: { bg: '#d1fae5', text: '#065f46' }
    };
    const c = config[type] || config.FIXED;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{type}</span>;
  };

  const handleCreate = () => {
    setForm({ title: '', supplier: '', contract_type: 'SERVICE', start_date: '', end_date: '', total_value: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newContract: Contract = {
      id: Date.now(),
      reference: `CON-2026-${String(contracts.length + 1).padStart(3, '0')}`,
      title: form.title,
      supplier: form.supplier,
      contract_type: form.contract_type as Contract['contract_type'],
      start_date: form.start_date,
      end_date: form.end_date,
      total_value: parseFloat(form.total_value),
      spent_value: 0,
      status: 'DRAFT'
    };
    setContracts([newContract, ...contracts]);
    setShowModal(false);
  };

  const totalActive = contracts.filter(c => c.status === 'ACTIVE').reduce((acc, c) => acc + c.total_value, 0);
  const totalSpent = contracts.reduce((acc, c) => acc + c.spent_value, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Procurement Contracts</h1>
        <p style={{ color: '#6b7280' }}>Manage supplier contracts and agreements</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><FileText size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Contracts</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{contracts.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active Value</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalActive)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Spent</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(totalSpent)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Expiring Soon</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{contracts.filter(c => c.status === 'EXPIRING').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Contract List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Contract
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Contract</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Value</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Utilization</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => {
              const utilization = (contract.spent_value / contract.total_value) * 100;
              return (
                <tr key={contract.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{contract.reference}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{contract.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{contract.supplier}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getTypeBadge(contract.contract_type)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{contract.start_date} to {contract.end_date}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(contract.total_value)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(utilization, 100)}%`, height: '100%', backgroundColor: utilization > 90 ? '#ef4444' : utilization > 75 ? '#f59e0b' : '#10b981', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{utilization.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(contract.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                    <button style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Contract</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Supplier *</label>
                  <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Type *</label>
                  <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="FIXED">Fixed</option>
                    <option value="FRAMEWORK">Framework</option>
                    <option value="BLANKET">Blanket</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Start Date *</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>End Date *</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Value (ZAR)</label>
                  <input type="number" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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

export default Contracts;
