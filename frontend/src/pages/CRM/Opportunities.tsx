import React, { useState } from 'react';
import { Plus, Edit2, Eye, DollarSign, Calendar, TrendingUp, Target } from 'lucide-react';

interface Opportunity {
  id: number;
  name: string;
  customer: string;
  value: number;
  probability: number;
  stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  expected_close: string;
  owner: string;
  created_at: string;
}

const Opportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([
    { id: 1, name: 'ERP Implementation - Tech Solutions', customer: 'Tech Solutions', value: 850000, probability: 75, stage: 'NEGOTIATION', expected_close: '2026-02-28', owner: 'Sarah Johnson', created_at: '2025-12-15' },
    { id: 2, name: 'Annual Support Contract - Global Corp', customer: 'Global Corp', value: 320000, probability: 90, stage: 'PROPOSAL', expected_close: '2026-02-15', owner: 'Mike Brown', created_at: '2026-01-05' },
    { id: 3, name: 'Hardware Upgrade - Local Industries', customer: 'Local Industries', value: 180000, probability: 50, stage: 'QUALIFICATION', expected_close: '2026-03-31', owner: 'Tom Wilson', created_at: '2026-01-10' },
    { id: 4, name: 'Cloud Migration - Metro Services', customer: 'Metro Services', value: 450000, probability: 60, stage: 'PROPOSAL', expected_close: '2026-03-15', owner: 'Sarah Johnson', created_at: '2026-01-12' },
    { id: 5, name: 'Training Package - SA Enterprises', customer: 'SA Enterprises', value: 95000, probability: 100, stage: 'CLOSED_WON', expected_close: '2026-01-20', owner: 'Mike Brown', created_at: '2025-12-20' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', customer: '', value: '', probability: '', stage: '', expected_close: '', owner: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (stage: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      PROSPECTING: { bg: '#f3f4f6', text: '#374151', label: 'Prospecting' },
      QUALIFICATION: { bg: '#dbeafe', text: '#1e40af', label: 'Qualification' },
      PROPOSAL: { bg: '#fef3c7', text: '#92400e', label: 'Proposal' },
      NEGOTIATION: { bg: '#e0e7ff', text: '#3730a3', label: 'Negotiation' },
      CLOSED_WON: { bg: '#dcfce7', text: '#166534', label: 'Won' },
      CLOSED_LOST: { bg: '#fee2e2', text: '#991b1b', label: 'Lost' }
    };
    const c = config[stage] || config.PROSPECTING;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.label}</span>;
  };

  const handleCreate = () => {
    setForm({ name: '', customer: '', value: '', probability: '', stage: 'PROSPECTING', expected_close: '', owner: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newOpp: Opportunity = {
      id: Date.now(),
      name: form.name,
      customer: form.customer,
      value: parseFloat(form.value) || 0,
      probability: parseInt(form.probability) || 0,
      stage: form.stage as Opportunity['stage'],
      expected_close: form.expected_close,
      owner: form.owner,
      created_at: new Date().toISOString().split('T')[0]
    };
    setOpportunities([newOpp, ...opportunities]);
    setShowModal(false);
  };

  const totalPipeline = opportunities.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)).reduce((acc, o) => acc + o.value, 0);
  const weightedPipeline = opportunities.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)).reduce((acc, o) => acc + (o.value * o.probability / 100), 0);
  const wonValue = opportunities.filter(o => o.stage === 'CLOSED_WON').reduce((acc, o) => acc + o.value, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Opportunities</h1>
        <p style={{ color: '#6b7280' }}>Track and manage sales opportunities through the pipeline</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Target size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Open Opportunities</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{opportunities.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)).length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pipeline Value</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(totalPipeline)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '10px' }}><TrendingUp size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Weighted Value</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(weightedPipeline)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Won This Month</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(wonValue)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Opportunity List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Opportunity
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Opportunity</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Value</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Probability</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Expected Close</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Owner</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Stage</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opp) => (
              <tr key={opp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{opp.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{opp.customer}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(opp.value)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div style={{ width: '60px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${opp.probability}%`, height: '100%', backgroundColor: opp.probability >= 75 ? '#10b981' : opp.probability >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{opp.probability}%</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{opp.expected_close}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{opp.owner}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(opp.stage)}</td>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Opportunity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Opportunity Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Customer *</label>
                  <input type="text" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Value (ZAR) *</label>
                  <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Probability (%)</label>
                  <input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Expected Close *</label>
                  <input type="date" value={form.expected_close} onChange={(e) => setForm({ ...form, expected_close: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Stage</label>
                  <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="PROSPECTING">Prospecting</option>
                    <option value="QUALIFICATION">Qualification</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="NEGOTIATION">Negotiation</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Owner</label>
                  <select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Owner</option>
                    <option value="Sarah Johnson">Sarah Johnson</option>
                    <option value="Mike Brown">Mike Brown</option>
                    <option value="Tom Wilson">Tom Wilson</option>
                  </select>
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

export default Opportunities;
