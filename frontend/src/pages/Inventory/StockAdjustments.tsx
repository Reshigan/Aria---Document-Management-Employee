import React, { useState } from 'react';
import { Plus, Edit2, Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface StockAdjustment {
  id: number;
  reference: string;
  product: string;
  sku: string;
  warehouse: string;
  adjustment_type: 'INCREASE' | 'DECREASE' | 'WRITE_OFF' | 'CORRECTION';
  quantity: number;
  reason: string;
  date: string;
  created_by: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
}

const StockAdjustments: React.FC = () => {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([
    { id: 1, reference: 'ADJ-2026-001', product: 'Widget A', sku: 'WGT-001', warehouse: 'Main Warehouse', adjustment_type: 'INCREASE', quantity: 50, reason: 'Stock count correction', date: '2026-01-15', created_by: 'John Smith', status: 'COMPLETED' },
    { id: 2, reference: 'ADJ-2026-002', product: 'Gadget B', sku: 'GDG-002', warehouse: 'Main Warehouse', adjustment_type: 'DECREASE', quantity: 25, reason: 'Damaged goods', date: '2026-01-16', created_by: 'Sarah Johnson', status: 'COMPLETED' },
    { id: 3, reference: 'ADJ-2026-003', product: 'Component C', sku: 'CMP-003', warehouse: 'Secondary Warehouse', adjustment_type: 'WRITE_OFF', quantity: 100, reason: 'Expired stock', date: '2026-01-18', created_by: 'Mike Brown', status: 'APPROVED' },
    { id: 4, reference: 'ADJ-2026-004', product: 'Part D', sku: 'PRT-004', warehouse: 'Main Warehouse', adjustment_type: 'CORRECTION', quantity: 15, reason: 'System error correction', date: '2026-01-20', created_by: 'Lisa Davis', status: 'PENDING' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product: '', sku: '', warehouse: '', adjustment_type: 'INCREASE', quantity: '', reason: '' });

  const getTypeBadge = (type: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      INCREASE: { bg: '#dcfce7', text: '#166534', icon: <TrendingUp size={14} /> },
      DECREASE: { bg: '#fee2e2', text: '#991b1b', icon: <TrendingDown size={14} /> },
      WRITE_OFF: { bg: '#fef3c7', text: '#92400e', icon: <AlertTriangle size={14} /> },
      CORRECTION: { bg: '#dbeafe', text: '#1e40af', icon: <Package size={14} /> }
    };
    const c = config[type] || config.INCREASE;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.icon} {type.replace('_', ' ')}</span>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: '#fef3c7', text: '#92400e' },
      APPROVED: { bg: '#dbeafe', text: '#1e40af' },
      COMPLETED: { bg: '#dcfce7', text: '#166534' }
    };
    const c = config[status] || config.PENDING;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const handleCreate = () => {
    setForm({ product: '', sku: '', warehouse: '', adjustment_type: 'INCREASE', quantity: '', reason: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newAdj: StockAdjustment = {
      id: Date.now(),
      reference: `ADJ-2026-${String(adjustments.length + 1).padStart(3, '0')}`,
      product: form.product,
      sku: form.sku,
      warehouse: form.warehouse,
      adjustment_type: form.adjustment_type as StockAdjustment['adjustment_type'],
      quantity: parseInt(form.quantity),
      reason: form.reason,
      date: new Date().toISOString().split('T')[0],
      created_by: 'Current User',
      status: 'PENDING'
    };
    setAdjustments([newAdj, ...adjustments]);
    setShowModal(false);
  };

  const handleApprove = (id: number) => setAdjustments(adjustments.map(a => a.id === id ? { ...a, status: 'APPROVED' as const } : a));
  const handleComplete = (id: number) => setAdjustments(adjustments.map(a => a.id === id ? { ...a, status: 'COMPLETED' as const } : a));

  const totalIncrease = adjustments.filter(a => a.adjustment_type === 'INCREASE').reduce((acc, a) => acc + a.quantity, 0);
  const totalDecrease = adjustments.filter(a => ['DECREASE', 'WRITE_OFF'].includes(a.adjustment_type)).reduce((acc, a) => acc + a.quantity, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Stock Adjustments</h1>
        <p style={{ color: '#6b7280' }}>Record and manage inventory adjustments</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Package size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Adjustments</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{adjustments.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><TrendingUp size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Units Added</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>+{totalIncrease}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><TrendingDown size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Units Removed</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>-{totalDecrease}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending Approval</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{adjustments.filter(a => a.status === 'PENDING').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Adjustment History</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Adjustment
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Product</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Warehouse</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Qty</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reason</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((adj) => (
              <tr key={adj.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{adj.reference}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{adj.product}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{adj.sku}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{adj.warehouse}</td>
                <td style={{ padding: '12px 16px' }}>{getTypeBadge(adj.adjustment_type)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: adj.adjustment_type === 'INCREASE' ? '#10b981' : '#ef4444', textAlign: 'right' }}>
                  {adj.adjustment_type === 'INCREASE' ? '+' : '-'}{adj.quantity}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{adj.reason}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(adj.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  {adj.status === 'PENDING' && <button onClick={() => handleApprove(adj.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>}
                  {adj.status === 'APPROVED' && <button onClick={() => handleComplete(adj.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>Complete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Stock Adjustment</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Product *</label>
                  <input type="text" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>SKU *</label>
                  <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Warehouse *</label>
                  <select value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="">Select Warehouse</option>
                    <option value="Main Warehouse">Main Warehouse</option>
                    <option value="Secondary Warehouse">Secondary Warehouse</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Type *</label>
                  <select value={form.adjustment_type} onChange={(e) => setForm({ ...form, adjustment_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="INCREASE">Increase</option>
                    <option value="DECREASE">Decrease</option>
                    <option value="WRITE_OFF">Write Off</option>
                    <option value="CORRECTION">Correction</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Quantity *</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Reason *</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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

export default StockAdjustments;
