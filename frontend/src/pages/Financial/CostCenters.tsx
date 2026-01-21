import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Building2, Users, DollarSign } from 'lucide-react';

interface CostCenter {
  id: number;
  code: string;
  name: string;
  department: string;
  manager: string;
  budget: number;
  actual: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const CostCenters: React.FC = () => {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([
    { id: 1, code: 'CC-001', name: 'Head Office', department: 'Administration', manager: 'John Smith', budget: 500000, actual: 320000, status: 'ACTIVE' },
    { id: 2, code: 'CC-002', name: 'Sales Division', department: 'Sales', manager: 'Sarah Johnson', budget: 750000, actual: 680000, status: 'ACTIVE' },
    { id: 3, code: 'CC-003', name: 'IT Department', department: 'IT', manager: 'Mike Brown', budget: 400000, actual: 350000, status: 'ACTIVE' },
    { id: 4, code: 'CC-004', name: 'Manufacturing Plant', department: 'Operations', manager: 'Lisa Davis', budget: 1200000, actual: 980000, status: 'ACTIVE' },
    { id: 5, code: 'CC-005', name: 'R&D Lab', department: 'R&D', manager: 'Tom Wilson', budget: 300000, actual: 150000, status: 'ACTIVE' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CostCenter | null>(null);
  const [form, setForm] = useState({ code: '', name: '', department: '', manager: '', budget: '' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const handleCreate = () => {
    setEditingItem(null);
    setForm({ code: '', name: '', department: '', manager: '', budget: '' });
    setShowModal(true);
  };

  const handleEdit = (item: CostCenter) => {
    setEditingItem(item);
    setForm({ code: item.code, name: item.name, department: item.department, manager: item.manager, budget: item.budget.toString() });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingItem) {
      setCostCenters(costCenters.map(c => c.id === editingItem.id ? { ...c, ...form, budget: parseFloat(form.budget) } : c));
    } else {
      setCostCenters([...costCenters, { id: Date.now(), ...form, budget: parseFloat(form.budget), actual: 0, status: 'ACTIVE' }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this cost center?')) {
      setCostCenters(costCenters.filter(c => c.id !== id));
    }
  };

  const totalBudget = costCenters.reduce((acc, c) => acc + c.budget, 0);
  const totalActual = costCenters.reduce((acc, c) => acc + c.actual, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Cost Centers</h1>
        <p style={{ color: '#6b7280' }}>Manage organizational cost centers for expense tracking</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Building2 size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Cost Centers</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{costCenters.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Budget</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(totalBudget)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><DollarSign size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Actual</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(totalActual)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Cost Center List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Cost Center
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Department</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Manager</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Budget</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actual</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Variance</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {costCenters.map((cc) => {
              const variance = cc.budget - cc.actual;
              return (
                <tr key={cc.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{cc.code}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{cc.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{cc.department}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{cc.manager}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>{formatCurrency(cc.budget)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>{formatCurrency(cc.actual)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: variance >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(variance)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => handleEdit(cc)} style={{ padding: '4px 8px', marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(cc.id)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>{editingItem ? 'Edit Cost Center' : 'New Cost Center'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Department *</label>
                  <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Manager *</label>
                  <input type="text" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Budget (ZAR) *</label>
                <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCenters;
