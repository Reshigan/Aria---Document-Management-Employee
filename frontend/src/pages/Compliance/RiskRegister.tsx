import React, { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Shield, TrendingUp, CheckCircle } from 'lucide-react';

interface Risk {
  id: number;
  reference: string;
  title: string;
  category: string;
  description: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  risk_score: number;
  owner: string;
  mitigation: string;
  controls: string[];
  review_date: string;
  status: 'IDENTIFIED' | 'ASSESSED' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED';
}

const RiskRegister: React.FC = () => {
  const [risks, setRisks] = useState<Risk[]>([
    { id: 1, reference: 'RSK-001', title: 'Data Breach', category: 'IT Security', description: 'Unauthorized access to customer data', likelihood: 2, impact: 5, risk_score: 10, owner: 'IT Manager', mitigation: 'Implement MFA, encrypt data at rest', controls: ['Firewall', 'MFA', 'Encryption'], review_date: '2026-03-01', status: 'MITIGATED' },
    { id: 2, reference: 'RSK-002', title: 'Key Person Dependency', category: 'Operational', description: 'Critical knowledge held by single employees', likelihood: 3, impact: 4, risk_score: 12, owner: 'HR Director', mitigation: 'Cross-training program, documentation', controls: ['Training Program', 'SOPs'], review_date: '2026-02-15', status: 'ASSESSED' },
    { id: 3, reference: 'RSK-003', title: 'Supplier Failure', category: 'Supply Chain', description: 'Key supplier unable to deliver', likelihood: 2, impact: 4, risk_score: 8, owner: 'Procurement Manager', mitigation: 'Maintain backup suppliers', controls: ['Supplier Diversification', 'Safety Stock'], review_date: '2026-04-01', status: 'MITIGATED' },
    { id: 4, reference: 'RSK-004', title: 'Regulatory Non-Compliance', category: 'Compliance', description: 'Failure to meet POPIA requirements', likelihood: 2, impact: 5, risk_score: 10, owner: 'Compliance Officer', mitigation: 'Regular audits, staff training', controls: ['POPIA Training', 'Data Audit'], review_date: '2026-02-01', status: 'ASSESSED' },
    { id: 5, reference: 'RSK-005', title: 'Cash Flow Shortage', category: 'Financial', description: 'Insufficient cash for operations', likelihood: 3, impact: 5, risk_score: 15, owner: 'CFO', mitigation: 'Maintain credit facility, improve collections', controls: ['Credit Line', 'Cash Forecasting'], review_date: '2026-01-31', status: 'IDENTIFIED' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', description: '', likelihood: '3', impact: '3', owner: '', mitigation: '' });

  const getRiskLevel = (score: number) => {
    if (score >= 15) return { level: 'Critical', color: '#991b1b', bg: '#fee2e2' };
    if (score >= 10) return { level: 'High', color: '#c2410c', bg: '#ffedd5' };
    if (score >= 5) return { level: 'Medium', color: '#a16207', bg: '#fef3c7' };
    return { level: 'Low', color: '#166534', bg: '#dcfce7' };
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      IDENTIFIED: { bg: '#fee2e2', text: '#991b1b' },
      ASSESSED: { bg: '#fef3c7', text: '#92400e' },
      MITIGATED: { bg: '#dcfce7', text: '#166534' },
      ACCEPTED: { bg: '#dbeafe', text: '#1e40af' },
      CLOSED: { bg: '#f3f4f6', text: '#374151' }
    };
    const c = config[status] || config.IDENTIFIED;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const handleCreate = () => {
    setForm({ title: '', category: '', description: '', likelihood: '3', impact: '3', owner: '', mitigation: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const likelihood = parseInt(form.likelihood) as Risk['likelihood'];
    const impact = parseInt(form.impact) as Risk['impact'];
    const newRisk: Risk = {
      id: Date.now(),
      reference: `RSK-${String(risks.length + 1).padStart(3, '0')}`,
      title: form.title,
      category: form.category,
      description: form.description,
      likelihood,
      impact,
      risk_score: likelihood * impact,
      owner: form.owner,
      mitigation: form.mitigation,
      controls: [],
      review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'IDENTIFIED'
    };
    setRisks([newRisk, ...risks]);
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this risk?')) {
      setRisks(risks.filter(r => r.id !== id));
    }
  };

  const criticalRisks = risks.filter(r => r.risk_score >= 15).length;
  const highRisks = risks.filter(r => r.risk_score >= 10 && r.risk_score < 15).length;
  const mitigatedRisks = risks.filter(r => r.status === 'MITIGATED').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Risk Register</h1>
        <p style={{ color: '#6b7280' }}>Identify, assess, and manage organizational risks</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Shield size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Risks</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{risks.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Critical</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{criticalRisks}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#ffedd5', borderRadius: '10px' }}><TrendingUp size={24} style={{ color: '#ea580c' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>High</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ea580c' }}>{highRisks}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Mitigated</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{mitigatedRisks}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Risk List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Add Risk
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Risk</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>L x I</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Score</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Owner</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Review Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((risk) => {
              const riskLevel = getRiskLevel(risk.risk_score);
              return (
                <tr key={risk.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{risk.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{risk.reference}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{risk.category}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{risk.likelihood} x {risk.impact}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '4px 12px', fontSize: '14px', fontWeight: 'bold', borderRadius: '9999px', backgroundColor: riskLevel.bg, color: riskLevel.color }}>
                      {risk.risk_score}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{risk.owner}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{risk.review_date}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(risk.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(risk.id)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Add Risk</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Risk Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Category</option>
                    <option value="IT Security">IT Security</option>
                    <option value="Operational">Operational</option>
                    <option value="Financial">Financial</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Supply Chain">Supply Chain</option>
                    <option value="Reputational">Reputational</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Owner *</label>
                  <input type="text" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Likelihood (1-5) *</label>
                  <select value={form.likelihood} onChange={(e) => setForm({ ...form, likelihood: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="1">1 - Rare</option>
                    <option value="2">2 - Unlikely</option>
                    <option value="3">3 - Possible</option>
                    <option value="4">4 - Likely</option>
                    <option value="5">5 - Almost Certain</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Impact (1-5) *</label>
                  <select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="1">1 - Insignificant</option>
                    <option value="2">2 - Minor</option>
                    <option value="3">3 - Moderate</option>
                    <option value="4">4 - Major</option>
                    <option value="5">5 - Catastrophic</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Mitigation Strategy</label>
                <textarea value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Add Risk</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskRegister;
