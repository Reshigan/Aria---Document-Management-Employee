import React, { useState } from 'react';
import { Plus, Edit2, Wrench, AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react';

interface MaintenanceRecord {
  id: number;
  reference: string;
  machine: string;
  machine_code: string;
  maintenance_type: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE' | 'BREAKDOWN';
  description: string;
  scheduled_date: string;
  completed_date: string | null;
  technician: string;
  cost: number;
  downtime_hours: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
}

const MachineMaintenance: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([
    { id: 1, reference: 'MNT-2026-001', machine: 'CNC Machine 1', machine_code: 'CNC-001', maintenance_type: 'PREVENTIVE', description: 'Monthly lubrication and inspection', scheduled_date: '2026-01-20', completed_date: '2026-01-20', technician: 'John Smith', cost: 2500, downtime_hours: 4, status: 'COMPLETED' },
    { id: 2, reference: 'MNT-2026-002', machine: 'Assembly Line A', machine_code: 'ASM-001', maintenance_type: 'CORRECTIVE', description: 'Belt replacement', scheduled_date: '2026-01-21', completed_date: null, technician: 'Mike Brown', cost: 8500, downtime_hours: 8, status: 'IN_PROGRESS' },
    { id: 3, reference: 'MNT-2026-003', machine: 'Packaging Unit', machine_code: 'PKG-001', maintenance_type: 'PREVENTIVE', description: 'Quarterly calibration', scheduled_date: '2026-01-25', completed_date: null, technician: 'Sarah Johnson', cost: 1500, downtime_hours: 2, status: 'SCHEDULED' },
    { id: 4, reference: 'MNT-2026-004', machine: 'Welding Station 2', machine_code: 'WLD-002', maintenance_type: 'BREAKDOWN', description: 'Emergency repair - power unit failure', scheduled_date: '2026-01-18', completed_date: null, technician: 'Tom Wilson', cost: 15000, downtime_hours: 16, status: 'OVERDUE' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ machine: '', machine_code: '', maintenance_type: 'PREVENTIVE', description: '', scheduled_date: '', technician: '', cost: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      SCHEDULED: { bg: '#dbeafe', text: '#1e40af', icon: <Calendar size={14} /> },
      IN_PROGRESS: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={14} /> },
      COMPLETED: { bg: '#dcfce7', text: '#166534', icon: <CheckCircle size={14} /> },
      OVERDUE: { bg: '#fee2e2', text: '#991b1b', icon: <AlertTriangle size={14} /> }
    };
    const c = config[status] || config.SCHEDULED;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {status}</span>;
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      PREVENTIVE: { bg: '#dcfce7', text: '#166534' },
      CORRECTIVE: { bg: '#fef3c7', text: '#92400e' },
      PREDICTIVE: { bg: '#dbeafe', text: '#1e40af' },
      BREAKDOWN: { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[type] || config.PREVENTIVE;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{type}</span>;
  };

  const handleCreate = () => {
    setForm({ machine: '', machine_code: '', maintenance_type: 'PREVENTIVE', description: '', scheduled_date: '', technician: '', cost: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newRecord: MaintenanceRecord = {
      id: Date.now(),
      reference: `MNT-2026-${String(records.length + 1).padStart(3, '0')}`,
      machine: form.machine,
      machine_code: form.machine_code,
      maintenance_type: form.maintenance_type as MaintenanceRecord['maintenance_type'],
      description: form.description,
      scheduled_date: form.scheduled_date,
      completed_date: null,
      technician: form.technician,
      cost: parseFloat(form.cost) || 0,
      downtime_hours: 0,
      status: 'SCHEDULED'
    };
    setRecords([newRecord, ...records]);
    setShowModal(false);
  };

  const totalCost = records.reduce((acc, r) => acc + r.cost, 0);
  const totalDowntime = records.reduce((acc, r) => acc + r.downtime_hours, 0);
  const overdueCount = records.filter(r => r.status === 'OVERDUE').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Machine Maintenance</h1>
        <p style={{ color: '#6b7280' }}>Schedule and track equipment maintenance</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Wrench size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Records</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{records.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Clock size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Downtime</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{totalDowntime}h</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><CheckCircle size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>MTD Cost</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalCost)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Overdue</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{overdueCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Maintenance Schedule</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Schedule Maintenance
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Machine</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Scheduled</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Cost</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{record.reference}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{record.machine}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{record.machine_code}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>{getTypeBadge(record.maintenance_type)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{record.description}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{record.scheduled_date}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(record.cost)}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(record.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Schedule Maintenance</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Machine *</label>
                  <input type="text" value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Code *</label>
                  <input type="text" value={form.machine_code} onChange={(e) => setForm({ ...form, machine_code: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Type *</label>
                  <select value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="PREVENTIVE">Preventive</option>
                    <option value="CORRECTIVE">Corrective</option>
                    <option value="PREDICTIVE">Predictive</option>
                    <option value="BREAKDOWN">Breakdown</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Scheduled Date *</label>
                  <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Description *</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Technician</label>
                  <input type="text" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Est. Cost (ZAR)</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineMaintenance;
