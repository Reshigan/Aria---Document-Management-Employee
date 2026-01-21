import React, { useState } from 'react';
import { Plus, Edit2, Calendar, Clock, Package, CheckCircle, AlertTriangle } from 'lucide-react';

interface ProductionPlan {
  id: number;
  reference: string;
  product: string;
  work_order: string;
  planned_quantity: number;
  completed_quantity: number;
  start_date: string;
  end_date: string;
  machine: string;
  shift: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'ON_HOLD';
}

const ProductionPlanning: React.FC = () => {
  const [plans, setPlans] = useState<ProductionPlan[]>([
    { id: 1, reference: 'PP-2026-001', product: 'Widget A', work_order: 'WO-2026-0045', planned_quantity: 500, completed_quantity: 350, start_date: '2026-01-20', end_date: '2026-01-22', machine: 'Machine 1', shift: 'Day', status: 'IN_PROGRESS' },
    { id: 2, reference: 'PP-2026-002', product: 'Gadget B', work_order: 'WO-2026-0046', planned_quantity: 200, completed_quantity: 200, start_date: '2026-01-18', end_date: '2026-01-19', machine: 'Machine 2', shift: 'Night', status: 'COMPLETED' },
    { id: 3, reference: 'PP-2026-003', product: 'Component C', work_order: 'WO-2026-0047', planned_quantity: 1000, completed_quantity: 0, start_date: '2026-01-23', end_date: '2026-01-25', machine: 'Machine 1', shift: 'Day', status: 'SCHEDULED' },
    { id: 4, reference: 'PP-2026-004', product: 'Part D', work_order: 'WO-2026-0048', planned_quantity: 300, completed_quantity: 150, start_date: '2026-01-19', end_date: '2026-01-20', machine: 'Machine 3', shift: 'Day', status: 'DELAYED' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product: '', planned_quantity: '', start_date: '', end_date: '', machine: '', shift: 'Day' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      SCHEDULED: { bg: '#dbeafe', text: '#1e40af', icon: <Calendar size={14} /> },
      IN_PROGRESS: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> },
      COMPLETED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      DELAYED: { bg: '#fee2e2', text: '#991b1b', icon: <AlertTriangle size={14} /> },
      ON_HOLD: { bg: '#f3f4f6', text: '#374151', icon: <Clock size={14} /> }
    };
    const c = config[status] || config.SCHEDULED;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status.replace('_', ' ')}</span>;
  };

  const handleCreate = () => {
    setForm({ product: '', planned_quantity: '', start_date: '', end_date: '', machine: '', shift: 'Day' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newPlan: ProductionPlan = {
      id: Date.now(),
      reference: `PP-2026-${String(plans.length + 1).padStart(3, '0')}`,
      product: form.product,
      work_order: `WO-2026-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
      planned_quantity: parseInt(form.planned_quantity),
      completed_quantity: 0,
      start_date: form.start_date,
      end_date: form.end_date,
      machine: form.machine,
      shift: form.shift,
      status: 'SCHEDULED'
    };
    setPlans([newPlan, ...plans]);
    setShowModal(false);
  };

  const totalPlanned = plans.reduce((acc, p) => acc + p.planned_quantity, 0);
  const totalCompleted = plans.reduce((acc, p) => acc + p.completed_quantity, 0);
  const inProgress = plans.filter(p => p.status === 'IN_PROGRESS').length;
  const delayed = plans.filter(p => p.status === 'DELAYED').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Production Planning</h1>
        <p style={{ color: '#6b7280' }}>Schedule and manage production runs</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Package size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Planned Units</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{totalPlanned.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Completed</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{totalCompleted.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>In Progress</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{inProgress}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Delayed</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{delayed}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Production Schedule</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Plan
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Product</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Machine</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Schedule</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Progress</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const progress = (plan.completed_quantity / plan.planned_quantity) * 100;
              return (
                <tr key={plan.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{plan.reference}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{plan.work_order}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{plan.product}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '14px', color: '#111827' }}>{plan.machine}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{plan.shift} Shift</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{plan.start_date} - {plan.end_date}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress >= 100 ? '#10b981' : '#2563eb', borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{plan.completed_quantity}/{plan.planned_quantity}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(plan.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Production Plan</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Product *</label>
                  <input type="text" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Quantity *</label>
                  <input type="number" value={form.planned_quantity} onChange={(e) => setForm({ ...form, planned_quantity: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Machine *</label>
                  <select value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Machine</option>
                    <option value="Machine 1">Machine 1</option>
                    <option value="Machine 2">Machine 2</option>
                    <option value="Machine 3">Machine 3</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Shift *</label>
                  <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="Day">Day Shift</option>
                    <option value="Night">Night Shift</option>
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

export default ProductionPlanning;
