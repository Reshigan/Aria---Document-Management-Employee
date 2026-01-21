import React, { useState } from 'react';
import { Plus, Edit2, CheckCircle, Clock, Flag, Calendar, DollarSign, Target } from 'lucide-react';

interface Milestone {
  id: number;
  project: string;
  name: string;
  description: string;
  due_date: string;
  completed_date: string | null;
  deliverables: string[];
  budget: number;
  actual_cost: number;
  owner: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'AT_RISK';
}

const Milestones: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: 1, project: 'ERP Implementation', name: 'Phase 1: Requirements', description: 'Complete requirements gathering and documentation', due_date: '2026-01-31', completed_date: '2026-01-28', deliverables: ['Requirements Document', 'Stakeholder Sign-off'], budget: 50000, actual_cost: 48000, owner: 'John Smith', status: 'COMPLETED' },
    { id: 2, project: 'ERP Implementation', name: 'Phase 2: Development', description: 'Core module development', due_date: '2026-03-15', completed_date: null, deliverables: ['Core Modules', 'Unit Tests', 'Documentation'], budget: 150000, actual_cost: 85000, owner: 'Tom Wilson', status: 'IN_PROGRESS' },
    { id: 3, project: 'Office Renovation', name: 'Design Approval', description: 'Finalize and approve office design', due_date: '2026-02-15', completed_date: null, deliverables: ['Design Plans', 'Budget Approval'], budget: 25000, actual_cost: 22000, owner: 'Sarah Johnson', status: 'AT_RISK' },
    { id: 4, project: 'Marketing Campaign', name: 'Campaign Launch', description: 'Launch Q1 marketing campaign', due_date: '2026-02-01', completed_date: null, deliverables: ['Campaign Materials', 'Media Plan'], budget: 75000, actual_cost: 0, owner: 'Lisa Davis', status: 'NOT_STARTED' },
    { id: 5, project: 'ERP Implementation', name: 'Phase 3: Testing', description: 'UAT and system testing', due_date: '2026-04-30', completed_date: null, deliverables: ['Test Cases', 'UAT Sign-off', 'Bug Fixes'], budget: 80000, actual_cost: 0, owner: 'Mike Brown', status: 'NOT_STARTED' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ project: '', name: '', description: '', due_date: '', budget: '', owner: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      NOT_STARTED: { bg: '#f3f4f6', text: '#374151', icon: <Clock size={14} /> },
      IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af', icon: <Clock size={14} /> },
      COMPLETED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      DELAYED: { bg: '#fee2e2', text: '#991b1b', icon: <Flag size={14} /> },
      AT_RISK: { bg: '#fef3c7', text: '#92400e', icon: <Flag size={14} /> }
    };
    const c = config[status] || config.NOT_STARTED;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status.replace('_', ' ')}</span>;
  };

  const handleCreate = () => {
    setForm({ project: '', name: '', description: '', due_date: '', budget: '', owner: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newMilestone: Milestone = {
      id: Date.now(),
      project: form.project,
      name: form.name,
      description: form.description,
      due_date: form.due_date,
      completed_date: null,
      deliverables: [],
      budget: parseFloat(form.budget) || 0,
      actual_cost: 0,
      owner: form.owner,
      status: 'NOT_STARTED'
    };
    setMilestones([newMilestone, ...milestones]);
    setShowModal(false);
  };

  const handleComplete = (id: number) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, status: 'COMPLETED' as const, completed_date: new Date().toISOString().split('T')[0] } : m));
  };

  const completed = milestones.filter(m => m.status === 'COMPLETED').length;
  const inProgress = milestones.filter(m => m.status === 'IN_PROGRESS').length;
  const atRisk = milestones.filter(m => m.status === 'AT_RISK' || m.status === 'DELAYED').length;
  const totalBudget = milestones.reduce((acc, m) => acc + m.budget, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Project Milestones</h1>
        <p style={{ color: '#6b7280' }}>Track project milestones and deliverables</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Target size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Milestones</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{milestones.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Completed</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{completed}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Flag size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>At Risk</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{atRisk}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Budget</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{formatCurrency(totalBudget)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Milestone List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Add Milestone
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Milestone</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Project</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Due Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Budget</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actual</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Owner</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone) => (
              <tr key={milestone.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{milestone.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{milestone.description}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{milestone.project}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#6b7280' }}>
                    <Calendar size={14} /> {milestone.due_date}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(milestone.budget)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: milestone.actual_cost > milestone.budget ? '#ef4444' : '#6b7280', textAlign: 'right' }}>{formatCurrency(milestone.actual_cost)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{milestone.owner}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(milestone.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                  {milestone.status !== 'COMPLETED' && (
                    <button onClick={() => handleComplete(milestone.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Complete</button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Add Milestone</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Project *</label>
                <input type="text" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Milestone Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Due Date *</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Budget (ZAR)</label>
                  <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Owner *</label>
                <input type="text" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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

export default Milestones;
