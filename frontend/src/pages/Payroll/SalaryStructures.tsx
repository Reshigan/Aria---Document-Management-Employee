import React, { useState } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Users, TrendingUp, Briefcase } from 'lucide-react';

interface SalaryStructure {
  id: number;
  name: string;
  code: string;
  grade: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  medical_aid: number;
  pension_contribution: number;
  total_ctc: number;
  employees_count: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const SalaryStructures: React.FC = () => {
  const [structures, setStructures] = useState<SalaryStructure[]>([
    { id: 1, name: 'Executive Package', code: 'EXE-001', grade: 'E1', basic_salary: 85000, housing_allowance: 15000, transport_allowance: 8000, medical_aid: 5000, pension_contribution: 12750, total_ctc: 125750, employees_count: 3, status: 'ACTIVE' },
    { id: 2, name: 'Senior Management', code: 'MGT-001', grade: 'M1', basic_salary: 55000, housing_allowance: 10000, transport_allowance: 5000, medical_aid: 4000, pension_contribution: 8250, total_ctc: 82250, employees_count: 8, status: 'ACTIVE' },
    { id: 3, name: 'Middle Management', code: 'MGT-002', grade: 'M2', basic_salary: 38000, housing_allowance: 7000, transport_allowance: 4000, medical_aid: 3500, pension_contribution: 5700, total_ctc: 58200, employees_count: 15, status: 'ACTIVE' },
    { id: 4, name: 'Professional Staff', code: 'PRO-001', grade: 'P1', basic_salary: 28000, housing_allowance: 5000, transport_allowance: 3000, medical_aid: 3000, pension_contribution: 4200, total_ctc: 43200, employees_count: 25, status: 'ACTIVE' },
    { id: 5, name: 'Support Staff', code: 'SUP-001', grade: 'S1', basic_salary: 18000, housing_allowance: 3000, transport_allowance: 2000, medical_aid: 2500, pension_contribution: 2700, total_ctc: 28200, employees_count: 12, status: 'ACTIVE' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', grade: '', basic_salary: '', housing_allowance: '', transport_allowance: '', medical_aid: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      INACTIVE: { bg: '#f3f4f6', text: '#374151' }
    };
    const c = config[status] || config.ACTIVE;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const handleCreate = () => {
    setForm({ name: '', code: '', grade: '', basic_salary: '', housing_allowance: '', transport_allowance: '', medical_aid: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const basic = parseFloat(form.basic_salary) || 0;
    const housing = parseFloat(form.housing_allowance) || 0;
    const transport = parseFloat(form.transport_allowance) || 0;
    const medical = parseFloat(form.medical_aid) || 0;
    const pension = basic * 0.15;
    
    const newStructure: SalaryStructure = {
      id: Date.now(),
      name: form.name,
      code: form.code,
      grade: form.grade,
      basic_salary: basic,
      housing_allowance: housing,
      transport_allowance: transport,
      medical_aid: medical,
      pension_contribution: pension,
      total_ctc: basic + housing + transport + medical + pension,
      employees_count: 0,
      status: 'ACTIVE'
    };
    setStructures([newStructure, ...structures]);
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this salary structure?')) {
      setStructures(structures.filter(s => s.id !== id));
    }
  };

  const totalEmployees = structures.reduce((acc, s) => acc + s.employees_count, 0);
  const avgCTC = structures.reduce((acc, s) => acc + s.total_ctc, 0) / structures.length;
  const totalPayroll = structures.reduce((acc, s) => acc + (s.total_ctc * s.employees_count), 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Salary Structures</h1>
        <p style={{ color: '#6b7280' }}>Define and manage compensation packages</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Briefcase size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Structures</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{structures.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Users size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Employees</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{totalEmployees}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><TrendingUp size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Avg CTC</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(avgCTC)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Monthly Payroll</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{formatCurrency(totalPayroll)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Salary Structure List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Structure
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Structure</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Basic</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Allowances</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Benefits</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Total CTC</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employees</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {structures.map((structure) => (
              <tr key={structure.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{structure.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{structure.code} | Grade: {structure.grade}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(structure.basic_salary)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{formatCurrency(structure.housing_allowance + structure.transport_allowance)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{formatCurrency(structure.medical_aid + structure.pension_contribution)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', color: '#2563eb', textAlign: 'right' }}>{formatCurrency(structure.total_ctc)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'center' }}>{structure.employees_count}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(structure.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(structure.id)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Salary Structure</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Structure Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Grade *</label>
                  <input type="text" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Basic Salary (ZAR) *</label>
                  <input type="number" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Housing Allowance</label>
                  <input type="number" value={form.housing_allowance} onChange={(e) => setForm({ ...form, housing_allowance: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Transport Allowance</label>
                  <input type="number" value={form.transport_allowance} onChange={(e) => setForm({ ...form, transport_allowance: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Medical Aid</label>
                  <input type="number" value={form.medical_aid} onChange={(e) => setForm({ ...form, medical_aid: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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

export default SalaryStructures;
