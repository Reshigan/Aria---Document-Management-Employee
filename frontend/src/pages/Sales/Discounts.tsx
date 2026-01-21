import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Percent, Calendar, Tag } from 'lucide-react';

interface Discount {
  id: number;
  name: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED' | 'VOLUME' | 'BUNDLE';
  value: number;
  min_quantity: number;
  max_uses: number;
  uses_count: number;
  valid_from: string;
  valid_to: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
}

const Discounts: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([
    { id: 1, name: 'New Customer Discount', code: 'NEWCUST10', type: 'PERCENTAGE', value: 10, min_quantity: 1, max_uses: 1000, uses_count: 245, valid_from: '2026-01-01', valid_to: '2026-06-30', status: 'ACTIVE' },
    { id: 2, name: 'Bulk Order Discount', code: 'BULK15', type: 'PERCENTAGE', value: 15, min_quantity: 100, max_uses: 500, uses_count: 89, valid_from: '2026-01-01', valid_to: '2026-12-31', status: 'ACTIVE' },
    { id: 3, name: 'Fixed R500 Off', code: 'SAVE500', type: 'FIXED', value: 500, min_quantity: 1, max_uses: 200, uses_count: 156, valid_from: '2026-01-01', valid_to: '2026-03-31', status: 'ACTIVE' },
    { id: 4, name: 'Volume Tier Discount', code: 'VOL20', type: 'VOLUME', value: 20, min_quantity: 500, max_uses: 100, uses_count: 12, valid_from: '2026-01-01', valid_to: '2026-12-31', status: 'ACTIVE' },
    { id: 5, name: 'Holiday Special', code: 'HOLIDAY25', type: 'PERCENTAGE', value: 25, min_quantity: 1, max_uses: 500, uses_count: 500, valid_from: '2025-12-01', valid_to: '2025-12-31', status: 'EXPIRED' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', type: 'PERCENTAGE', value: '', min_quantity: '1', max_uses: '', valid_from: '', valid_to: '' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      INACTIVE: { bg: '#f3f4f6', text: '#374151' },
      EXPIRED: { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[status] || config.INACTIVE;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      PERCENTAGE: { bg: '#dbeafe', text: '#1e40af' },
      FIXED: { bg: '#fef3c7', text: '#92400e' },
      VOLUME: { bg: '#e0e7ff', text: '#3730a3' },
      BUNDLE: { bg: '#d1fae5', text: '#065f46' }
    };
    const c = config[type] || config.PERCENTAGE;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{type}</span>;
  };

  const formatValue = (type: string, value: number) => {
    if (type === 'PERCENTAGE' || type === 'VOLUME') return `${value}%`;
    return `R ${value.toLocaleString()}`;
  };

  const handleCreate = () => {
    setForm({ name: '', code: '', type: 'PERCENTAGE', value: '', min_quantity: '1', max_uses: '', valid_from: '', valid_to: '' });
    setShowModal(true);
  };

  const handleSave = () => {
    const newDiscount: Discount = {
      id: Date.now(),
      name: form.name,
      code: form.code,
      type: form.type as Discount['type'],
      value: parseFloat(form.value),
      min_quantity: parseInt(form.min_quantity),
      max_uses: parseInt(form.max_uses),
      uses_count: 0,
      valid_from: form.valid_from,
      valid_to: form.valid_to,
      status: 'ACTIVE'
    };
    setDiscounts([newDiscount, ...discounts]);
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this discount?')) {
      setDiscounts(discounts.filter(d => d.id !== id));
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Discounts</h1>
        <p style={{ color: '#6b7280' }}>Create and manage discount codes and promotions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Tag size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Discounts</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{discounts.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Percent size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{discounts.filter(d => d.status === 'ACTIVE').length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Uses</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{discounts.reduce((acc, d) => acc + d.uses_count, 0)}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><Calendar size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Expired</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{discounts.filter(d => d.status === 'EXPIRED').length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Discount List</h2>
        <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> New Discount
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Code</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Value</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Valid Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Uses</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((discount) => (
              <tr key={discount.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{discount.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#2563eb', fontWeight: 600 }}>{discount.code}</td>
                <td style={{ padding: '12px 16px' }}>{getTypeBadge(discount.type)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{formatValue(discount.type, discount.value)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{discount.valid_from} to {discount.valid_to}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{discount.uses_count} / {discount.max_uses}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(discount.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button style={{ padding: '4px 8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(discount.id)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>New Discount</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Type *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                    <option value="VOLUME">Volume Discount</option>
                    <option value="BUNDLE">Bundle Discount</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Value *</label>
                  <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Min Quantity</label>
                  <input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Max Uses</label>
                  <input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Valid From *</label>
                  <input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Valid To *</label>
                  <input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
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

export default Discounts;
