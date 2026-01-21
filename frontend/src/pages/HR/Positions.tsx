import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Users, Briefcase, Building2, TrendingUp } from 'lucide-react';

interface Position {
  id: number;
  title: string;
  code: string;
  department: string;
  level: string;
  reports_to: string;
  headcount: number;
  filled: number;
  min_salary: number;
  max_salary: number;
  status: 'ACTIVE' | 'INACTIVE' | 'FROZEN';
}

const Positions: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([
    { id: 1, title: 'Software Engineer', code: 'IT-SE-001', department: 'IT', level: 'Mid', reports_to: 'IT Manager', headcount: 5, filled: 4, min_salary: 450000, max_salary: 650000, status: 'ACTIVE' },
    { id: 2, title: 'Sales Representative', code: 'SL-SR-001', department: 'Sales', level: 'Junior', reports_to: 'Sales Manager', headcount: 8, filled: 6, min_salary: 280000, max_salary: 380000, status: 'ACTIVE' },
    { id: 3, title: 'Finance Manager', code: 'FN-FM-001', department: 'Finance', level: 'Senior', reports_to: 'CFO', headcount: 1, filled: 1, min_salary: 750000, max_salary: 950000, status: 'ACTIVE' },
    { id: 4, title: 'HR Coordinator', code: 'HR-HC-001', department: 'HR', level: 'Junior', reports_to: 'HR Manager', headcount: 2, filled: 2, min_salary: 250000, max_salary: 350000, status: 'ACTIVE' },
    { id: 5, title: 'Operations Analyst', code: 'OP-OA-001', department: 'Operations', level: 'Mid', reports_to: 'Operations Manager', headcount: 3, filled: 2, min_salary: 380000, max_salary: 520000, status: 'ACTIVE' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', code: '', department: '', level: '', reports_to: '', headcount: '', min_salary: '', max_salary: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      INACTIVE: { bg: '#f3f4f6', text: '#374151' },
      FROZEN: { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[status] || config.ACTIVE;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const handleCreate = () => {
    setForm({ title: '', code: '', department: '', level: '', reports_to: '', headcount: '', min_salary: '', max_salary: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newPosition: Position = {
      id: Date.now(),
      title: form.title,
      code: form.code,
      department: form.department,
      level: form.level,
      reports_to: form.reports_to,
      headcount: parseInt(form.headcount),
      filled: 0,
      min_salary: parseFloat(form.min_salary),
      max_salary: parseFloat(form.max_salary),
      status: 'ACTIVE'
    };
    setPositions([newPosition, ...positions]);
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this position?')) {
      setPositions(positions.filter(p => p.id !== id));
    }
  };

  const totalHeadcount = positions.reduce((acc, p) => acc + p.headcount, 0);
  const totalFilled = positions.reduce((acc, p) => acc + p.filled, 0);
  const vacancies = totalHeadcount - totalFilled;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Positions</h1>
        <p style={{ color: '#6b7280' }}>Manage organizational positions and job roles</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Briefcase size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Positions</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{positions.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Users size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Filled</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{totalFilled}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><TrendingUp size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Vacancies</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{vacancies}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><Building2 size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Departments</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{new Set(positions.map(p => p.department)).size}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Position List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Position
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Position</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Department</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Level</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reports To</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Headcount</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Salary Range</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{position.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{position.code}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{position.department}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{position.level}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{position.reports_to}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{position.filled}</span>
                  <span style={{ color: '#6b7280' }}> / </span>
                  <span style={{ color: '#111827', fontWeight: 600 }}>{position.headcount}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatCurrency(position.min_salary)} - {formatCurrency(position.max_salary)}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(position.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(position.id)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Position</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Title *</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Department *</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Department</option>
                    <option value="IT">IT</option>
                    <option value="Sales">Sales</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Level *</label>
                  <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Level</option>
                    <option value="Junior">Junior</option>
                    <option value="Mid">Mid</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Reports To</label>
                  <input type="text" value={form.reports_to} onChange={(e) => setForm({ ...form, reports_to: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Headcount *</label>
                  <input type="number" value={form.headcount} onChange={(e) => setForm({ ...form, headcount: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Min Salary (ZAR)</label>
                  <input type="number" value={form.min_salary} onChange={(e) => setForm({ ...form, min_salary: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Max Salary (ZAR)</label>
                  <input type="number" value={form.max_salary} onChange={(e) => setForm({ ...form, max_salary: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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

export default Positions;
