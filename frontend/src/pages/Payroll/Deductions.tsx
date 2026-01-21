import React, { useState } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Calculator, Percent, FileText } from 'lucide-react';

interface Deduction {
  id: number;
  name: string;
  code: string;
  type: 'STATUTORY' | 'VOLUNTARY' | 'LOAN' | 'GARNISHMENT';
  calculation_type: 'FIXED' | 'PERCENTAGE';
  value: number;
  max_amount: number | null;
  applies_to: string;
  employees_count: number;
  total_deducted: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const Deductions: React.FC = () => {
  const [deductions, setDeductions] = useState<Deduction[]>([
    { id: 1, name: 'PAYE Tax', code: 'PAYE', type: 'STATUTORY', calculation_type: 'PERCENTAGE', value: 0, max_amount: null, applies_to: 'All Employees', employees_count: 63, total_deducted: 485000, status: 'ACTIVE' },
    { id: 2, name: 'UIF Contribution', code: 'UIF', type: 'STATUTORY', calculation_type: 'PERCENTAGE', value: 1, max_amount: 177.12, applies_to: 'All Employees', employees_count: 63, total_deducted: 11169, status: 'ACTIVE' },
    { id: 3, name: 'Pension Fund', code: 'PEN', type: 'VOLUNTARY', calculation_type: 'PERCENTAGE', value: 7.5, max_amount: null, applies_to: 'Permanent Staff', employees_count: 55, total_deducted: 125000, status: 'ACTIVE' },
    { id: 4, name: 'Medical Aid', code: 'MED', type: 'VOLUNTARY', calculation_type: 'FIXED', value: 3500, max_amount: null, applies_to: 'Opted-in Employees', employees_count: 48, total_deducted: 168000, status: 'ACTIVE' },
    { id: 5, name: 'Staff Loan', code: 'LOAN', type: 'LOAN', calculation_type: 'FIXED', value: 2500, max_amount: null, applies_to: 'Loan Recipients', employees_count: 8, total_deducted: 20000, status: 'ACTIVE' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', type: 'VOLUNTARY', calculation_type: 'FIXED', value: '', max_amount: '', applies_to: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getTypeBadge = (type: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      STATUTORY: { bg: '#fee2e2', text: '#991b1b' },
      VOLUNTARY: { bg: '#dcfce7', text: '#166534' },
      LOAN: { bg: '#dbeafe', text: '#1e40af' },
      GARNISHMENT: { bg: '#fef3c7', text: '#92400e' }
    };
    const c = config[type] || config.VOLUNTARY;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{type}</span>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      INACTIVE: { bg: '#f3f4f6', text: '#374151' }
    };
    const c = config[status] || config.ACTIVE;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const handleCreate = () => {
    setForm({ name: '', code: '', type: 'VOLUNTARY', calculation_type: 'FIXED', value: '', max_amount: '', applies_to: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newDeduction: Deduction = {
      id: Date.now(),
      name: form.name,
      code: form.code,
      type: form.type as Deduction['type'],
      calculation_type: form.calculation_type as Deduction['calculation_type'],
      value: parseFloat(form.value),
      max_amount: form.max_amount ? parseFloat(form.max_amount) : null,
      applies_to: form.applies_to,
      employees_count: 0,
      total_deducted: 0,
      status: 'ACTIVE'
    };
    setDeductions([newDeduction, ...deductions]);
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this deduction?')) {
      setDeductions(deductions.filter(d => d.id !== id));
    }
  };

  const totalDeducted = deductions.reduce((acc, d) => acc + d.total_deducted, 0);
  const statutoryTotal = deductions.filter(d => d.type === 'STATUTORY').reduce((acc, d) => acc + d.total_deducted, 0);
  const voluntaryTotal = deductions.filter(d => d.type === 'VOLUNTARY').reduce((acc, d) => acc + d.total_deducted, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Payroll Deductions</h1>
        <p style={{ color: '#6b7280' }}>Manage statutory and voluntary deductions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><FileText size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Deduction Types</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{deductions.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><Calculator size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Statutory</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(statutoryTotal)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Percent size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Voluntary</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(voluntaryTotal)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Deducted</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{formatCurrency(totalDeducted)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Deduction List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Deduction
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Deduction</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Calculation</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Applies To</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employees</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>MTD Total</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deductions.map((deduction) => (
              <tr key={deduction.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{deduction.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{deduction.code}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>{getTypeBadge(deduction.type)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                  {deduction.calculation_type === 'PERCENTAGE' 
                    ? `${deduction.value}%${deduction.max_amount ? ` (max ${formatCurrency(deduction.max_amount)})` : ''}`
                    : formatCurrency(deduction.value)
                  }
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{deduction.applies_to}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'center' }}>{deduction.employees_count}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatCurrency(deduction.total_deducted)}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(deduction.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                  {deduction.type !== 'STATUTORY' && (
                    <button onClick={() => handleDelete(deduction.id)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Deduction</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Type *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="VOLUNTARY">Voluntary</option>
                    <option value="LOAN">Loan</option>
                    <option value="GARNISHMENT">Garnishment</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Calculation *</label>
                  <select value={form.calculation_type} onChange={(e) => setForm({ ...form, calculation_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="FIXED">Fixed Amount</option>
                    <option value="PERCENTAGE">Percentage</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Value *</label>
                  <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} placeholder={form.calculation_type === 'PERCENTAGE' ? '%' : 'ZAR'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Max Amount</label>
                  <input type="number" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} placeholder="Optional" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Applies To</label>
                <input type="text" value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} placeholder="e.g., All Employees, Permanent Staff" />
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

export default Deductions;
