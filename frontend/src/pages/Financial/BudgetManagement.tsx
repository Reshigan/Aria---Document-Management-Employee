import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface Budget {
  id: number;
  name: string;
  fiscal_year: string;
  department: string;
  total_amount: number;
  spent_amount: number;
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'CLOSED';
  created_at: string;
}

const BudgetManagement: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([
    { id: 1, name: 'Marketing Budget 2026', fiscal_year: '2026', department: 'Marketing', total_amount: 500000, spent_amount: 125000, status: 'ACTIVE', created_at: '2026-01-01' },
    { id: 2, name: 'IT Infrastructure', fiscal_year: '2026', department: 'IT', total_amount: 750000, spent_amount: 320000, status: 'ACTIVE', created_at: '2026-01-01' },
    { id: 3, name: 'HR Training Budget', fiscal_year: '2026', department: 'HR', total_amount: 200000, spent_amount: 45000, status: 'ACTIVE', created_at: '2026-01-01' },
    { id: 4, name: 'Operations Q1', fiscal_year: '2026', department: 'Operations', total_amount: 1000000, spent_amount: 890000, status: 'ACTIVE', created_at: '2026-01-01' },
    { id: 5, name: 'R&D Projects', fiscal_year: '2026', department: 'R&D', total_amount: 300000, spent_amount: 0, status: 'DRAFT', created_at: '2026-01-15' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState({ name: '', fiscal_year: '2026', department: '', total_amount: '' });

  const totalBudget = budgets.reduce((acc, b) => acc + b.total_amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent_amount, 0);
  const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      APPROVED: { bg: '#dbeafe', text: '#1e40af' },
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      CLOSED: { bg: '#fee2e2', text: '#991b1b' }
    };
    const color = colors[status] || colors.DRAFT;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status}</span>;
  };

  const getUtilizationColor = (spent: number, total: number) => {
    const rate = (spent / total) * 100;
    if (rate >= 90) return '#ef4444';
    if (rate >= 70) return '#f59e0b';
    return '#10b981';
  };

  const handleCreate = () => {
    setEditingBudget(null);
    setForm({ name: '', fiscal_year: '2026', department: '', total_amount: '' });
    setShowModal(true);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setForm({
      name: budget.name,
      fiscal_year: budget.fiscal_year,
      department: budget.department,
      total_amount: budget.total_amount.toString()
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingBudget) {
      setBudgets(budgets.map(b => b.id === editingBudget.id ? {
        ...b,
        name: form.name,
        fiscal_year: form.fiscal_year,
        department: form.department,
        total_amount: parseFloat(form.total_amount)
      } : b));
    } else {
      setBudgets([...budgets, {
        id: Date.now(),
        name: form.name,
        fiscal_year: form.fiscal_year,
        department: form.department,
        total_amount: parseFloat(form.total_amount),
        spent_amount: 0,
        status: 'DRAFT',
        created_at: new Date().toISOString().split('T')[0]
      }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      setBudgets(budgets.filter(b => b.id !== id));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Budget Management</h1>
        <p style={{ color: '#6b7280' }}>Create and manage departmental budgets</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}>
              <DollarSign size={24} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Budget</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(totalBudget)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}>
              <TrendingDown size={24} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Spent</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(totalSpent)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}>
              <TrendingUp size={24} style={{ color: '#10b981' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Remaining</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(totalBudget - totalSpent)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f3e8ff', borderRadius: '10px' }}>
              <DollarSign size={24} style={{ color: '#9333ea' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Utilization</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{utilizationRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Budgets</h2>
        <button
          onClick={handleCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={18} /> New Budget
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Budget Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Department</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Fiscal Year</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Spent</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Utilization</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((budget) => {
              const utilization = (budget.spent_amount / budget.total_amount) * 100;
              return (
                <tr key={budget.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{budget.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{budget.department}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{budget.fiscal_year}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>{formatCurrency(budget.total_amount)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>{formatCurrency(budget.spent_amount)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(utilization, 100)}%`, height: '100%', backgroundColor: getUtilizationColor(budget.spent_amount, budget.total_amount), borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280', minWidth: '40px' }}>{utilization.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(budget.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => handleEdit(budget)} style={{ padding: '4px 8px', marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(budget.id)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={16} />
                    </button>
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>{editingBudget ? 'Edit Budget' : 'New Budget'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Budget Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Department *</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="">Select Department</option>
                    <option value="Marketing">Marketing</option>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="R&D">R&D</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Fiscal Year *</label>
                  <select
                    value={form.fiscal_year}
                    onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Total Amount (ZAR) *</label>
                <input
                  type="number"
                  value={form.total_amount}
                  onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
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

export default BudgetManagement;
