import React, { useState } from 'react';
import { Plus, Edit2, AlertTriangle, Package, TrendingDown, Bell } from 'lucide-react';

interface ReorderPoint {
  id: number;
  product: string;
  sku: string;
  category: string;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  lead_time_days: number;
  supplier: string;
  status: 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
}

const ReorderPoints: React.FC = () => {
  const [items, setItems] = useState<ReorderPoint[]>([
    { id: 1, product: 'Widget A', sku: 'WGT-001', category: 'Components', current_stock: 250, reorder_point: 100, reorder_quantity: 500, lead_time_days: 7, supplier: 'ABC Supplies', status: 'OK' },
    { id: 2, product: 'Gadget B', sku: 'GDG-002', category: 'Electronics', current_stock: 45, reorder_point: 50, reorder_quantity: 200, lead_time_days: 14, supplier: 'XYZ Corp', status: 'LOW' },
    { id: 3, product: 'Component C', sku: 'CMP-003', category: 'Components', current_stock: 15, reorder_point: 75, reorder_quantity: 300, lead_time_days: 10, supplier: 'Global Parts', status: 'CRITICAL' },
    { id: 4, product: 'Part D', sku: 'PRT-004', category: 'Hardware', current_stock: 0, reorder_point: 25, reorder_quantity: 100, lead_time_days: 5, supplier: 'Local Supplies', status: 'OUT_OF_STOCK' },
    { id: 5, product: 'Material E', sku: 'MAT-005', category: 'Raw Materials', current_stock: 500, reorder_point: 200, reorder_quantity: 1000, lead_time_days: 21, supplier: 'Metro Materials', status: 'OK' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ReorderPoint | null>(null);
  const [form, setForm] = useState({ product: '', sku: '', category: '', reorder_point: '', reorder_quantity: '', lead_time_days: '', supplier: '' });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      OK: { bg: '#dcfce7', text: '#166534', label: 'OK' },
      LOW: { bg: '#fef3c7', text: '#92400e', label: 'Low Stock' },
      CRITICAL: { bg: '#fed7aa', text: '#c2410c', label: 'Critical' },
      OUT_OF_STOCK: { bg: '#fee2e2', text: '#991b1b', label: 'Out of Stock' }
    };
    const c = config[status] || config.OK;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{c.label}</span>;
  };

  const handleEdit = (item: ReorderPoint) => {
    setEditingItem(item);
    setForm({
      product: item.product,
      sku: item.sku,
      category: item.category,
      reorder_point: item.reorder_point.toString(),
      reorder_quantity: item.reorder_quantity.toString(),
      lead_time_days: item.lead_time_days.toString(),
      supplier: item.supplier
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingItem) {
      setItems(items.map(i => i.id === editingItem.id ? {
        ...i,
        reorder_point: parseInt(form.reorder_point),
        reorder_quantity: parseInt(form.reorder_quantity),
        lead_time_days: parseInt(form.lead_time_days),
        supplier: form.supplier
      } : i));
    }
    setShowModal(false);
    setEditingItem(null);
  };

  const criticalCount = items.filter(i => i.status === 'CRITICAL' || i.status === 'OUT_OF_STOCK').length;
  const lowCount = items.filter(i => i.status === 'LOW').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Reorder Points</h1>
        <p style={{ color: '#6b7280' }}>Configure automatic reorder triggers for inventory items</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Package size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Items</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{items.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '10px' }}><AlertTriangle size={24} style={{ color: '#ef4444' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Critical / Out</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{criticalCount}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><TrendingDown size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Low Stock</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{lowCount}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Bell size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Alerts Active</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{criticalCount + lowCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Reorder Configuration</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Product</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Current</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Reorder At</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Order Qty</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Lead Time</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Supplier</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.product}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.sku}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{item.category}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: item.current_stock <= item.reorder_point ? '#ef4444' : '#111827', textAlign: 'right' }}>{item.current_stock}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{item.reorder_point}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>{item.reorder_quantity}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{item.lead_time_days} days</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{item.supplier}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(item.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button onClick={() => handleEdit(item)} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Edit Reorder Point</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{form.product}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{form.sku} - {form.category}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Reorder Point *</label>
                  <input type="number" value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Reorder Quantity *</label>
                  <input type="number" value={form.reorder_quantity} onChange={(e) => setForm({ ...form, reorder_quantity: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Lead Time (days) *</label>
                  <input type="number" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Supplier</label>
                  <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => { setShowModal(false); setEditingItem(null); }} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReorderPoints;
