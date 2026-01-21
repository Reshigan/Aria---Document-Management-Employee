import React, { useState } from 'react';
import { Plus, Edit2, Eye, FileText, Calendar, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';

interface ServiceContract {
  id: number;
  reference: string;
  customer: string;
  contract_type: 'MAINTENANCE' | 'WARRANTY' | 'SLA' | 'SUPPORT';
  start_date: string;
  end_date: string;
  value: number;
  visits_included: number;
  visits_used: number;
  response_time: string;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'CANCELLED';
}

const ServiceContracts: React.FC = () => {
  const [contracts, setContracts] = useState<ServiceContract[]>([
    { id: 1, reference: 'SC-2026-001', customer: 'ABC Manufacturing', contract_type: 'MAINTENANCE', start_date: '2026-01-01', end_date: '2026-12-31', value: 120000, visits_included: 12, visits_used: 1, response_time: '4 hours', status: 'ACTIVE' },
    { id: 2, reference: 'SC-2026-002', customer: 'XYZ Retail', contract_type: 'SLA', start_date: '2026-01-01', end_date: '2026-06-30', value: 85000, visits_included: 24, visits_used: 3, response_time: '2 hours', status: 'ACTIVE' },
    { id: 3, reference: 'SC-2025-015', customer: 'Tech Solutions', contract_type: 'SUPPORT', start_date: '2025-01-01', end_date: '2026-01-31', value: 65000, visits_included: 6, visits_used: 6, response_time: '8 hours', status: 'EXPIRING' },
    { id: 4, reference: 'SC-2025-008', customer: 'Global Logistics', contract_type: 'WARRANTY', start_date: '2024-06-01', end_date: '2025-12-31', value: 0, visits_included: 0, visits_used: 2, response_time: '24 hours', status: 'EXPIRED' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customer: '', contract_type: 'MAINTENANCE', start_date: '', end_date: '', value: '', visits_included: '', response_time: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      ACTIVE: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      EXPIRING: { bg: '#fef3c7', text: '#92400e', icon: <AlertTriangle size={14} /> },
      EXPIRED: { bg: '#fee2e2', text: '#991b1b', icon: <Calendar size={14} /> },
      CANCELLED: { bg: '#f3f4f6', text: '#374151', icon: <FileText size={14} /> }
    };
    const c = config[status] || config.ACTIVE;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status}</span>;
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      MAINTENANCE: { bg: '#dbeafe', text: '#1e40af' },
      WARRANTY: { bg: '#dcfce7', text: '#166534' },
      SLA: { bg: '#e0e7ff', text: '#3730a3' },
      SUPPORT: { bg: '#fef3c7', text: '#92400e' }
    };
    const c = config[type] || config.MAINTENANCE;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{type}</span>;
  };

  const handleCreate = () => {
    setForm({ customer: '', contract_type: 'MAINTENANCE', start_date: '', end_date: '', value: '', visits_included: '', response_time: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newContract: ServiceContract = {
      id: Date.now(),
      reference: `SC-2026-${String(contracts.length + 1).padStart(3, '0')}`,
      customer: form.customer,
      contract_type: form.contract_type as ServiceContract['contract_type'],
      start_date: form.start_date,
      end_date: form.end_date,
      value: parseFloat(form.value) || 0,
      visits_included: parseInt(form.visits_included) || 0,
      visits_used: 0,
      response_time: form.response_time,
      status: 'ACTIVE'
    };
    setContracts([newContract, ...contracts]);
    setShowModal(false);
  };

  const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
  const totalValue = contracts.filter(c => c.status === 'ACTIVE').reduce((acc, c) => acc + c.value, 0);
  const expiringCount = contracts.filter(c => c.status === 'EXPIRING').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Service Contracts</h1>
        <p style={{ color: '#6b7280' }}>Manage customer service agreements and SLAs</p>
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
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{activeContracts}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active Value</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{formatCurrency(totalValue)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Expiring Soon</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{expiringCount}</div>
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
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Contract</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Value</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Visits</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Response</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{contract.reference}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{contract.customer}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>{getTypeBadge(contract.contract_type)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{contract.start_date} to {contract.end_date}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(contract.value)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{contract.visits_used}</span>
                  <span style={{ color: '#6b7280' }}> / </span>
                  <span style={{ color: '#111827', fontWeight: 600 }}>{contract.visits_included || '∞'}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{contract.response_time}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(contract.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Service Contract</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Customer *</label>
                  <input type="text" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Type *</label>
                  <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="WARRANTY">Warranty</option>
                    <option value="SLA">SLA</option>
                    <option value="SUPPORT">Support</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Start Date *</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>End Date *</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Value (ZAR)</label>
                  <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Visits Included</label>
                  <input type="number" value={form.visits_included} onChange={(e) => setForm({ ...form, visits_included: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Response Time</label>
                  <input type="text" value={form.response_time} onChange={(e) => setForm({ ...form, response_time: e.target.value })} placeholder="e.g., 4 hours" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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

export default ServiceContracts;
