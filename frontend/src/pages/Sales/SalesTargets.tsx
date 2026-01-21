import React, { useState } from 'react';
import { Plus, Edit2, Target, TrendingUp, Users, Award } from 'lucide-react';

interface SalesTarget {
  id: number;
  sales_rep: string;
  period: string;
  target_amount: number;
  achieved_amount: number;
  target_units: number;
  achieved_units: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'EXCEEDED';
}

const SalesTargets: React.FC = () => {
  const [targets, setTargets] = useState<SalesTarget[]>([
    { id: 1, sales_rep: 'Sarah Johnson', period: 'Q1 2026', target_amount: 2500000, achieved_amount: 1850000, target_units: 500, achieved_units: 380, status: 'ON_TRACK' },
    { id: 2, sales_rep: 'Mike Brown', period: 'Q1 2026', target_amount: 2000000, achieved_amount: 1200000, target_units: 400, achieved_units: 220, status: 'AT_RISK' },
    { id: 3, sales_rep: 'Tom Wilson', period: 'Q1 2026', target_amount: 1500000, achieved_amount: 650000, target_units: 300, achieved_units: 120, status: 'BEHIND' },
    { id: 4, sales_rep: 'Lisa Davis', period: 'Q1 2026', target_amount: 1800000, achieved_amount: 1950000, target_units: 350, achieved_units: 390, status: 'EXCEEDED' },
    { id: 5, sales_rep: 'Team Total', period: 'Q1 2026', target_amount: 7800000, achieved_amount: 5650000, target_units: 1550, achieved_units: 1110, status: 'ON_TRACK' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ sales_rep: '', period: '', target_amount: '', target_units: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      ON_TRACK: { bg: '#dcfce7', text: '#166534', label: 'On Track' },
      AT_RISK: { bg: '#fef3c7', text: '#92400e', label: 'At Risk' },
      BEHIND: { bg: '#fee2e2', text: '#991b1b', label: 'Behind' },
      EXCEEDED: { bg: '#dbeafe', text: '#1e40af', label: 'Exceeded' }
    };
    const c = config[status] || config.ON_TRACK;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.label}</span>;
  };

  const getProgressColor = (achieved: number, target: number) => {
    const pct = (achieved / target) * 100;
    if (pct >= 100) return '#2563eb';
    if (pct >= 75) return '#10b981';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const handleCreate = () => {
    setForm({ sales_rep: '', period: '', target_amount: '', target_units: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newTarget: SalesTarget = {
      id: Date.now(),
      sales_rep: form.sales_rep,
      period: form.period,
      target_amount: parseFloat(form.target_amount),
      achieved_amount: 0,
      target_units: parseInt(form.target_units),
      achieved_units: 0,
      status: 'ON_TRACK'
    };
    setTargets([...targets.slice(0, -1), newTarget, targets[targets.length - 1]]);
    setShowModal(false);
  };

  const totalTarget = targets.find(t => t.sales_rep === 'Team Total')?.target_amount || 0;
  const totalAchieved = targets.find(t => t.sales_rep === 'Team Total')?.achieved_amount || 0;
  const overallProgress = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Sales Targets</h1>
        <p style={{ color: '#6b7280' }}>Set and track sales targets for your team</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Target size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Team Target</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(totalTarget)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><TrendingUp size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Achieved</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalAchieved)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Users size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Sales Reps</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{targets.length - 1}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><Award size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Progress</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{overallProgress.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Target Performance</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Set Target
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Sales Rep</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Target</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Achieved</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Progress</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Units</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => {
              const progress = (target.achieved_amount / target.target_amount) * 100;
              const isTeamTotal = target.sales_rep === 'Team Total';
              return (
                <tr key={target.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: isTeamTotal ? '#f9fafb' : 'white' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: isTeamTotal ? 700 : 600, color: '#111827' }}>{target.sales_rep}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{target.period}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(target.target_amount)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#10b981', textAlign: 'right' }}>{formatCurrency(target.achieved_amount)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(progress, 100)}%`, height: '100%', backgroundColor: getProgressColor(target.achieved_amount, target.target_amount), borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', minWidth: '45px' }}>{progress.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{target.achieved_units} / {target.target_units}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(target.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {!isTeamTotal && <button style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>}
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Set Sales Target</h2>
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
                    <option value="Q1 2026">Q1 2026</option>
                    <option value="Q2 2026">Q2 2026</option>
                    <option value="Q3 2026">Q3 2026</option>
                    <option value="Q4 2026">Q4 2026</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Target Amount (ZAR) *</label>
                  <input type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Target Units</label>
                  <input type="number" value={form.target_units} onChange={(e) => setForm({ ...form, target_units: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Set Target</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTargets;
